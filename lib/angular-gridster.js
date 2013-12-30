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
  .directive('ngGridster', ['$parse', '$animate', '$timeout', function($parse, $animate, $timeout) {
    return {
      restrict: 'A',
      controller: function($scope) {
        var gridster, options, editable, changedFn;

        this.gridster = function(g) {
          if (g) {
            gridster = g;
          }

          return gridster;
        }

        this.options = function(arg) {
          if (arg) {
            options = $parse(arg)();
          }

          return options;
        }

        this.editable = function(arg) {
          if (arg) {
            editable = $parse(arg)();
          }

          return editable;
        }

        this.changedFn = function(arg) {
          if (arg) {
            changedFn = $parse(arg);
          }

          return changedFn;
        }

        this.serialize = function(e, ui, $widget) {
          if (changedFn) {
            changedFn($scope, { state: gridster.serialize() });
          }

          if (arguments.length > 2) {
            $widget.scope().$broadcast('widget-resized', {
              height: this.resize_coords.data.height,
              width: this.resize_coords.data.width
            });
          }
        }
      },
      link: function(scope, element, attr, controller) {
        controller.options(attr.ngGridster || '{}');
        controller.editable(attr.editable || 'true'); // Default to true
        controller.changedFn(attr.gridsterChanged);
      }
    }
  }])
  .directive('ngGridsterCell', ['$animate', '$timeout', function($animate, $timeout) {
    return {
      restrict: 'A',
      transclude: 'element',
      require: '^ngGridster',
      terminal: true,
      link: function(scope, element, attr, controller, transclude) {
        var expression = attr.ngGridsterCell, // Get the repeat expression
            gridId = attr.gridId,
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
            var options = controller.options();

            // Add drag and resize callbacks on the options hash if we have a changed function
            if (controller.changed) {
              options.draggable = options.draggable || {};
              options.draggable.stop = controller.serialize;

              options.resize = options.resize || {};
              options.resize.stop = controller.serialize;
            }

            var gridster = element.parent().gridster(options).data('gridster');

            // Disable dragging and resizing if it is disabled
            if (!controller.editable()) {
              gridster.disable();

              if (options.resize && options.resize.enabled) {
                gridster.disable_resize();
              }
            }

            // Set the gridster object on the controller
            controller.gridster(gridster);
          });
        });
      }
    };
  }]);
