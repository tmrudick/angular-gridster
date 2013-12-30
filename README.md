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

Documentation
-------------

Known Issues
------------

Contributing
------------