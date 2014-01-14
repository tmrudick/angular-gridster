'use strict';

/**
 * @ngdoc directive
 * @name gridster:ngGridster
 *
 * @description
 * The `ngGridster` directive instantiates a template once per item from a collection and then instantiates Gridster.js
 * on the instantiated templates. Each template instance gets its own scope, where the given loop variable is set to
 * the current collection item, and `$index` is set to the item index.
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
 * via the Gridster.js API.
 *
 * @element ANY
 * @scope
 * @priority 1000
 * @param {repeat_expression} ngGridster The expression indicating how to enumerate a collection.
 *
 *   * `variable in expression` – where variable is the user defined loop variable and `expression`
 *     is a scope expression giving the collection to enumerate.
 *
 *     For example: `album in artist.albums`.
 *
 */

angular.module('gridster', [])
  .directive('ngGridster', ['$parse', '$animate', function($parse, $animate) {
    return {
      restrict: 'A',
      controller: ['$scope', function($scope) {
        var gridster;

        this.gridster = function(arg) {
          return gridster = arg || gridster;
        }

        this.serialize = function(fn, e, ui, $widget) {
          fn($scope, { serialized: this.gridster().serialize() });

          if ($widget) {
            $widget.scope().$broadcast('gridster-widget-resized', {
              height: this.gridster().resize_coords.data.height,
              width: this.gridster().resize_coords.data.width
            });
          }
        }
      }],
      link: function(scope, element, attr, controller) {
        scope.$on('gridster-repeat-complete', function(e) {
          e.stopPropagation();

          // Parse options
          var options = $parse(attr.ngGridster)(scope) || {};

          // Attach event listeners to drag/resize stop events to send resize events
          // to widgets and to invoke the changed function.
          var callback = $parse(attr.gridsterChanged);
          options.draggable = options.draggable || {};
          options.draggable.stop = controller.serialize.bind(controller, callback);
          options.resize = options.resize || {};
          options.resize.stop = controller.serialize.bind(controller, callback);

          // Create the gridster object in the DOM
          var gridster = element.gridster(options).data('gridster');

          // Override all methods that change grid state to call the serialize function after executing
          ['add_widget', 'resize_widget', 'remove_widget', 'remove_all_widgets'].forEach(function(name) {
            var fn = gridster[name];
            gridster[name] = function() {
              fn.apply(gridster, Array.prototype.slice.call(arguments));
              controller.serialize(callback);
            }
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
              width: $widget.width()
            });
          });
        });
      }
    }
  }])
  .directive('ngGridsterRepeat', ['$animate', '$parse', '$timeout', function($animate, $parse, $timeout) {
    return {
      restrict: 'A',
      transclude: 'element',
      require: '^ngGridster',
      terminal: true,
      link: function(scope, element, attr, controller, transclude) {
        var expression = attr.ngGridsterRepeat, // Get the repeat expression
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
              clone[clone.length++] = document.createComment(' end ngGridster: ' + expression + ' ');

              // Add the cloned node into the DOM via $animate
              $animate.enter(clone, null, previousNode);

              // Move the previousNode to the one we just added
              previousNode = clone;
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
