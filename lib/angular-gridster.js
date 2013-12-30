angular.module('gridster', [])
  .directive('ngGridster', ['$parse', function($parse) {
    return {
      transclude: 'element',
      priority: 1000,
      terminal: true,
      $$tlb: true, // ?
      link: function(scope, element, attrs) {
        var expression = $attr.ngGridster;
        var match = expression.match(/^\s*(.+)\s+in\s+(.*?)$/),
          lhs, rhs, valueIdentifier, keyIdentifier,
          hashFnLocals = {$id: hashKey};

        if (!match) {
          throw ngRepeatMinErr('iexp', "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.", expression);
        }

        lhs = match[1];
        rhs = match[2];

        match = lhs.match(/^(?:([\$\w]+)|\(([\$\w]+)\s*,\s*([\$\w]+)\))$/);
        if (!match) {
          throw ngRepeatMinErr('iidexp', "'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{0}'.", lhs);
        }
        valueIdentifier = match[3] || match[1];
        keyIdentifier = match[2];



      }
    };
  }]);