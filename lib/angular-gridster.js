'use strict';

angular.module('gridster', [])
  /**
   * @ngdoc directive
   * @name gridster:gridster
   *
   * @description
   * The `gridster` directive waits for all widget DOM elements to be rendered and then creates and exposes a
   * Gridster.js object. If a callback function is passed via the `gridsterChanged` parameter, it will be called
   * whenever the serialized state of the grid changes.
   *
   * Additionally, any time a widget has been resized, a `gridster-widget-resized` event will be emitted on the
   * widget's scope. This event will have a single argument which is an object. It has a height and a width
   * property indicating the new resized size of the widget. This event will also be emitted when the grid first
   * instantiates to tell widgets what their initial size should be. This can be useful to dynamically resize
   * inner content when the grid size changes. The event will also send the results of gridster.serialize(), which
   * gives the position of all widgets on the grid. Detailed docs can be found here: http://gridster.net/#serialize_method
   *
   * Finally, any time a widget is finished dragging, a `gridster-widget-dragged` event will be emitted on the scope.
   * This event will emit a gridster serialization with the positions of all of the elements on the grid, similar to
   * the `gridster-widget-resized` event.
   * 
   * @element ANY
   * @requires gridster.js
   * @param {object} gridster An object which contains the base options for gridster.js.
   * @param {function} gridsterChanged A function to be called whenever the serialized state of the grid changed.
   * @param {expression} gridsterEditable A boolean expression to indicate if this grid should be editable.
   */
  .directive('gridster', ['$parse', function($parse) {
    return {
      restrict: 'A',
      controller: ['$scope', function($scope) {
        var gridster;

        this.gridster = function(arg) {
          return gridster = arg || gridster;
        };

        this.serialize = function(callback, e, ui, $widget) {
          callback.fn($scope, { serialized: this.gridster().serialize() });

          if ($widget || (callback.label === 'dragged' && ui.$player )) {
            if (callback.label === 'resized') {
              $widget.scope().$broadcast('gridster-widget-resized', {
                height: this.gridster().resize_coords.data.height,
                width: this.gridster().resize_coords.data.width,
                serialize: this.gridster().serialize()
              });
            } else if (callback.label === 'dragged') {
              ui.$player.scope().$broadcast('gridster-widget-dragged', {
                serialize: this.gridster().serialize()
              });
            }
          }
        };
      }],
      link: function(scope, element, attr, controller) {
        scope.$on('gridster-repeat-complete', function(e) {
          e.stopPropagation();

          // Parse options
          var options = $parse(attr.gridster)(scope) || {};

          // Attach event listeners to drag/resize stop events to send resize events
          // to widgets and to invoke the changed function.
          var callback = $parse(attr.gridsterChanged);
          options.draggable = options.draggable || {};
          options.draggable.stop = controller.serialize.bind(controller, { fn: callback, label: 'dragged' });
          options.resize = options.resize || {};
          options.resize.stop = controller.serialize.bind(controller, { fn: callback, label: 'resized' });

          // Create the gridster object in the DOM
          var gridster = element.gridster(options).data('gridster');

          // Override all methods that change grid state to call the serialize function after executing
          ['add_widget', 'on_stop_drag', 'resize_widget', 'remove_widget', 'remove_all_widgets'].forEach(function(name) {
            var fn = gridster[name];
            gridster[name] = function() {
              fn.apply(gridster, arguments);
              controller.serialize({ fn: callback });
            };
          });

          // Disable dragging and resizing if editable is false. Default to true/editable.
          if (!$parse(attr.gridsterEditable || 'true')(scope)) {
            gridster.disable();

            if (options.resize && options.resize.enabled) {
              gridster.disable_resize();
            }
          }

          controller.gridster(gridster);

          element.find('li.gridster-widget').each(function(index, el) {
            var $widget = $(el);
            $widget.scope().$broadcast('gridster-widget-resized', {
              height: $widget.height(),
              width: $widget.width(),
              serialize: []
            });
          });
        });
      }
    };
  }])

  /*
   * @ngdoc directive
   * @name gridster:gridsterRepeat
   *
   * @description
   * The `gridsterRepeat` directive instantiates a template once per item from a collection and then emits an event
   * to indicate that the grid is ready to be instantiated.  Each template instance gets its own scope, where the given
   * loop variable is set to the current collection item, and `$index` is set to the item index.
   *
   * Special properties are exposed on the local scope of each template instance, including:
   *
   * | Variable  | Type            | Details                                                                     |
   * |-----------|-----------------|-----------------------------------------------------------------------------|
   * | `$index`  | {@type number}  | iterator offset of the repeated element (0..length-1)                       |
   * | `$first`  | {@type boolean} | true if the repeated element is first in the iterator.                      |
   * | `$middle` | {@type boolean} | true if the repeated element is between the first and last in the iterator. |
   * | `$last`   | {@type boolean} | true if the repeated element is last in the iterator.                       |
   * | `$even`   | {@type boolean} | true if the iterator position `$index` is even (otherwise false).           |
   * | `$odd`    | {@type boolean} | true if the iterator position `$index` is odd (otherwise false).            |
   *
   * Although this works similarly to ngRepeat, this directive does not watch for changes in the collection after
   * it has been added to the DOM. It is expected that all DOM manipulation after the first draw happens
   * via the Gridster.js API on the gridster directive controller.
   *
   * Must be used as a child of a gridster directive.
   *
   * @element ANY
   * @scope
   * @param {repeat_expression} gridsterRepeat The expression indicating how to enumerate a collection.
   *   * `variable in expression` – where variable is the user defined loop variable and `expression`
   *     is a scope expression giving the collection to enumerate.
   *
   *     For example: `album in artist.albums`.
   *
   * @param {array} gridsterLayout An array returned by gridster's serialize method.
   */
  .directive('gridsterRepeat', ['$animate', '$parse', '$timeout', function($animate, $parse, $timeout) {
    return {
      multiElement: true,
      restrict: 'A',
      transclude: 'element',
      priority: 1000,
      require: '^gridster',
      terminal: true,
      $$tlb: true,
      link: function(scope, element, attr, controller, transclude) {
        var expression = attr.gridsterRepeat, // Get the repeat expression
            valueExp, collectionExp;

        // Make sure we have a 'item in something' expression
        var match = expression.match(/^\s*(.+)\s+in\s+(.*?)$/);

        if (!match) {
          throw new Error("Expected expression in form of '_item_ in _collection_' but got '" + expression + "'.");
        }

        valueExp = match[1];
        collectionExp = match[2];

        // Make sure we have a 'valid identifer in something' expression (ie: not '! in collection')
        match = valueExp.match(/^(?:([\$\w]+))$/);

        if (!match) {
          throw new Error("'_item_' in '_item_ in _collection_' should be an indentifier but got '" + valueExp + "'.");
        }

        var watcher = scope.$watchCollection(collectionExp, function(collection) {
          if (!collection) { return; }

          // Call the watcher function to stop watching the collection
          // After we finish with this function, gridster is going to handle the rest of the DOM manipulation
          watcher();

          var index = 0,
              length = collection.length,
              previousNode = element,
              childScope, value;

          // Double check that we have an array
          if (!Array.isArray(collection)) {
            throw new Error("'_collection_' in '_item_ in _collection_' should be an array but got '" + collection + "'.");
          }

          // This is used to keep track (and add) widgets that are not in the layout to the next empty row
          var maxRow = 1;

          for (; index < length; index++) {
            value = collection[index];
            childScope = scope.$new();

            // Populate child scope with ngRepeat-style variables
            childScope[valueExp] = value;
            childScope.$index = index;
            childScope.$first = (index === 0);
            childScope.$last = (index === (length - 1));
            childScope.$middle = !(childScope.$first || childScope.$last);
            childScope.$odd = !(childScope.$even = (index&1) === 0);

            transclude(childScope, function(clone) {
              // Add uniform css class
              clone.addClass('gridster-widget');

              // Parse the layout and set data-* gridster attributes
              var layout = $parse(attr.gridsterLayout)(childScope);

              if (layout) {
                if (Array.isArray(layout) && layout.length > index) {
                  layout = layout[index];
                } else if (Array.isArray(layout)) {
                  layout = {};
                }

                clone.attr('data-row', layout.row = layout.row || maxRow);
                clone.attr('data-col', layout.col = layout.col || 1);

                // Default to 1x1 is no size if specified
                clone.attr('data-sizex', layout.size_x = layout.size_x || 1);
                clone.attr('data-sizey', layout.size_y = layout.size_y || 1);

                // increment maxRow
                if ((layout.row + layout.size_y) >= maxRow) {
                  maxRow = layout.row + layout.size_y;
                }
              }

              // Add a comment to the cloned node to denote the end of a repeated DOM fragment
              clone[clone.length++] = document.createComment(' end gridster: ' + expression + ' ');

              // Add the cloned node into the DOM via $animate
              $animate.enter(clone, null, $(previousNode));

              // Make the previous node the comment of the node we just added
              previousNode = clone[clone.length - 1];
            });
          }

          // Need to wait until after the current $digest to instantiate gridster
          $timeout(function() {
            scope.$emit('gridster-repeat-complete');
          });
        });
      }
    };
  }]);
