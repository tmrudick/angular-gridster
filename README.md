angular-gridster
================

An Angular directive for Gridster.

Basic Usage
-----------

```html
<ul ng-gridster="{ draggable: { enabled: true } }">
  <li ng-gridster-widget="widget in widgets" data-row="{{ widget.row }}" data-col="{{ widget.col }}" data-sizex="{{ widget.sizex }}" data-sizey="{{ widget.sizey }}">{{ widget.title }}</li>
</ul>
```

You must use two directives to get this to work properly: `ngGridster` and `ngGridsterWidget`.

ngGridster Directive
--------------------

Holds basic information about the Gridster object such as options and callbacks. Additionally, exposes a gridster function to gain access to the underlying Gridster object. This can be used in sub-directives to interact directly with the grid. Can be useful for removing widgets.

### Parameters

* ngGridster - (String) JSON encoded Gridster options object.

* changed - (Expression) function which takes a state parameter to be called whenever the serialized version of the grid changes due to resize or drag.

ngGridsterWidget Directive
--------------------------

Stripped down version of `ngRepeat` which will repeat DOM elements once and then hand off all DOM manipulation off to Gridster. Additional items can be added via the Gridster API.

Unlike `ngRepeat`, `ngGridsterWidget` will only iterate over Arrays.

Similarly to `ngRepeat`, `ngGridsterWidget` exposes all of the same `$index`, `$last`, etc scope variables.

### Parameters

* ngGridsterWidget - (Expression) '_item_ in _collection_' expression where _item_ is an identifier and _collection_ is an Array on the scope.

Known Issues
------------

* Seems to be broken on Angular 1.2+

Contributing
------------

File an issue and send a pull request!

Please report any issues using the Github issue tracker for this project.