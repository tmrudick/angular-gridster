angular-gridster
================

An Angular directive for Gridster.

Basic Usage
-----------

```html
<ul gridster="{ draggable: { enabled: true } }" gridster-changed="updated(serialized)">
  <li gridster-repeat="widget in widgets" layout="layout[$index]">{{ widget.title }}</li>
</ul>
```

gridster Directive
--------------------

Holds grid-wide options and callbacks and instantiates Gridster. Also, it exposes a gridster function which can be used to access the Gridster API directly. The can be especially useful when resizing or removing widgets from subdirectives.

### Parameters

All parameters are optional.

* gridster - (String) JSON encoded Gridster options object.

* gridster-changed - (Expression) function which takes a parameter named serialized which will be called whenever the serialized version of the grid changes due to resize or drag.

* gridster-editable - (Expression) expression which evaluates to a boolean value indicating if the grid should be editable. If false, resizing and reordering is disabled.

gridsterRepeat Directive
--------------------------

Stripped down version of `ngRepeat` which will repeat DOM elements once and then hand off all DOM manipulation off to Gridster. Additional items can be added via the Gridster API.

This directive will NOT watch the collection for changes after elements have been added. I ran into many problems with using ngRepeat and Gridster. Specifically around removing elements from the grid.

Unlike `ngRepeat`, `gridsterRepeat` will only iterate over Arrays.

Similarly to `ngRepeat`, `gridsterRepeat` exposes all of the same `$index`, `$last`, etc scope variables.

### Parameters

* gridsterRepeat - (Expression) '_item_ in _collection_' expression where _item_ is an identifier and _collection_ is an Array on the scope.

* gridster-layout - (Expression) expression which evaluates to an array of serialized positions (from the Gridster serialize method) or a single object from that array (using something like `layout="grid[$index]"`).

Using the Gridster API directly
-------------------------------

It is possible to use the underlying Gridster API from a sub-directive.

```js
angular.module('directives', [])
  .directive('deletable', function() {
    return {
      template: '<button>Delete Me</button>',
      require: '^gridster',
      link: function(scope, element, attr, controller) {
        element.click(function() {
          controller.gridster().remove_widget(element.parent());
        });
      }
    };
  });
```

Contributing
------------

File an issue and send a pull request!

Please report any issues using the Github issue tracker for this project.
