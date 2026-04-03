/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.parse.lsp',
  name: 'FoamIndex',

  documentation: 'Query layer over the FOAM runtime class registry for LSP handlers.',

  properties: [
    {
      name: 'cache_',
      factory: function() { return {}; }
    },
    {
      name: 'fileIndex_',
      documentation: 'Class ID to file path mapping built from foam.poms.'
    }
  ],

  methods: [
    function getAllClassIds() {
      /**
       * Returns all known class IDs.
       * Uses __cache__ (not USED/UNUSED) because bootstrap classes
       * (FObject, Boolean, String, Property, etc.) are registered
       * in the context cache but never tracked in USED/UNUSED.
       */
      var cache = foam.__context__.__cache__;
      var ids = [];
      for ( var key in cache ) {
        // Skip short names (e.g., 'FObject' vs 'foam.lang.FObject')
        // by only including dotted names
        if ( key.indexOf('.') !== -1 ) ids.push(key);
      }
      return ids;
    },

    function getClass(id) {
      /** Resolves a class by ID, returns null if not found. */
      return foam.maybeLookup(id);
    },

    function classExists(id) {
      /** Returns true if the class ID is registered. */
      return foam.isRegistered(id);
    },

    function getPropertyTypes() {
      /** Finds all classes that extend foam.lang.Property. */
      if ( this.cache_.propertyTypes ) return this.cache_.propertyTypes;

      var PropertyClass = foam.lang.Property;
      var types = [];

      var ids = this.getAllClassIds();
      for ( var i = 0 ; i < ids.length ; i++ ) {
        try {
          var cls = foam.maybeLookup(ids[i]);
          if ( cls && PropertyClass.isSubClass(cls) ) {
            types.push({
              name: cls.model_.name,
              id:   cls.model_.id,
              doc:  cls.model_.documentation || ''
            });
          }
        } catch (x) {}
      }

      this.cache_.propertyTypes = types;
      return types;
    },

    function getAxioms(classId) {
      /** Returns all axioms for a class including inherited. */
      var cls = this.getClass(classId);
      if ( ! cls ) return [];
      return cls.getAxioms();
    },

    function getProperties(classId) {
      /** Returns property axioms for a class. */
      var cls = this.getClass(classId);
      if ( ! cls ) return [];
      return cls.getAxiomsByClass(foam.lang.Property);
    },

    function getMethods(classId) {
      /** Returns method axioms for a class. */
      var cls = this.getClass(classId);
      if ( ! cls ) return [];
      return cls.getAxiomsByClass(foam.lang.Method);
    },

    function getActions(classId) {
      /** Returns action axioms for a class. */
      var cls = this.getClass(classId);
      if ( ! cls ) return [];
      return cls.getAxiomsByClass(foam.lang.Action);
    },

    function getSourceLocation(classId) {
      /** Returns { path, line } for a class definition. */
      var cls = this.getClass(classId);
      if ( ! cls ) return null;
      var m = cls.model_;
      // m.source is set by foam_node.js during loading (document.currentScript.src in browser)
      // In Node.js builds, source is tracked on the model object
      var source = m.source || (foam.USED[classId] && foam.USED[classId].source) ||
                   (foam.UNUSED[classId] && foam.UNUSED[classId].source);
      return source ? { path: source, line: 1 } : null;
    },

    function getInheritanceChain(classId) {
      /** Returns [classId, parentId, ..., 'foam.lang.FObject']. */
      var chain = [];
      var cls = this.getClass(classId);
      while ( cls ) {
        chain.push(cls.id);
        if ( ! cls.model_.extends || cls.id === 'foam.lang.FObject' ) break;
        cls = this.getClass(cls.model_.extends);
      }
      return chain;
    },

    function getSubclasses(classId) {
      /** Returns all direct subclasses of a class. */
      var subs = [];
      var ids = this.getAllClassIds();
      for ( var i = 0 ; i < ids.length ; i++ ) {
        var m = foam.USED[ids[i]] || foam.UNUSED[ids[i]];
        if ( m && m.extends === classId ) subs.push(ids[i]);
      }
      return subs;
    },

    function getImports(classId) {
      /** Returns import axioms for a class. */
      var cls = this.getClass(classId);
      if ( ! cls ) return [];
      return cls.getAxiomsByClass(foam.lang.Import);
    },

    function getRequires(classId) {
      /** Returns requires axioms for a class. */
      var cls = this.getClass(classId);
      if ( ! cls ) return [];
      return cls.getAxiomsByClass(foam.lang.Requires);
    },

    function getEnumValues(classId) {
      /** Returns enum values for an enum class. */
      var cls = this.getClass(classId);
      if ( ! cls || ! cls.VALUES ) return [];
      return cls.VALUES.map(function(v) {
        return { name: v.name, label: v.label, ordinal: v.ordinal };
      });
    },

    function getClassDoc(classId) {
      /** Build markdown hover content for a class. */
      var cls = this.getClass(classId);
      if ( ! cls ) return null;
      var m = cls.model_;

      var md = '**' + m.id + '**\n\n';
      if ( m.extends && m.extends !== 'FObject' ) md += 'extends `' + m.extends + '`\n\n';
      if ( m.documentation ) md += m.documentation + '\n\n';

      var props = this.getProperties(classId);
      if ( props.length ) {
        md += '**Properties:** ' + props.map(function(p) {
          return '`' + p.name + '`';
        }).join(', ') + '\n';
      }

      return md;
    },

    function getPropertyDoc(classId, propName) {
      /** Build markdown hover content for a property. */
      var cls = this.getClass(classId);
      if ( ! cls ) return null;
      var prop = cls.getAxiomByName(propName);
      if ( ! prop ) return null;

      var md = '**' + propName + '** (' + (prop.cls_ && prop.cls_.model_ ? prop.cls_.model_.name : 'Property') + ')\n\n';
      if ( prop.documentation ) md += prop.documentation + '\n\n';
      if ( prop.value !== undefined && prop.value !== '' ) md += 'Default: `' + prop.value + '`\n';
      return md;
    },

    function invalidate(classId) {
      /** Clear cache for a class and dependents. */
      delete this.cache_[classId];
      delete this.cache_.propertyTypes;
    },

    function invalidateAll() {
      /** Clear all caches. */
      this.cache_ = {};
    },

    function buildFileIndex() {
      /**
       * Build class ID → file path mapping from POM data.
       * Handles files with multiple foam.CLASS definitions and
       * files where the filename differs from the class name.
       */
      this.fileIndex_ = {};
      var path_ = require('path');
      var fs_ = require('fs');
      var poms = foam.poms || [];
      for ( var p = 0 ; p < poms.length ; p++ ) {
        var pom = poms[p];
        var location = pom.location || '';
        var files = pom.files || [];
        for ( var f = 0 ; f < files.length ; f++ ) {
          var file = files[f];
          var filePath = path_.resolve(location, file.name + '.js');
          try {
            if ( ! fs_.existsSync(filePath) ) continue;
            var content = fs_.readFileSync(filePath, 'utf8');
            // Find each foam.CLASS/ENUM/INTERFACE call
            var callRegex = /foam\.(CLASS|ENUM|INTERFACE)\s*\(/g;
            var callMatch;
            while ( ( callMatch = callRegex.exec(content) ) !== null ) {
              // Look for package and name within the next 500 chars
              var snippet = content.substring(callMatch.index, callMatch.index + 500);
              var pkgM = snippet.match(/package\s*:\s*['"]([^'"]+)['"]/);
              var nameM = snippet.match(/name\s*:\s*['"]([^'"]+)['"]/);
              if ( nameM ) {
                var classId = pkgM ? pkgM[1] + '.' + nameM[1] : nameM[1];
                this.fileIndex_[classId] = filePath;
              }
            }
          } catch (e) {}
        }
      }
    },

    function getFilePath(classId) {
      if ( ! this.fileIndex_ ) this.buildFileIndex();
      return this.fileIndex_[classId] || null;
    },

    function getOwnProperties(classId) {
      var cls = this.getClass(classId);
      if ( ! cls ) return [];
      return cls.getOwnAxiomsByClass(foam.lang.Property);
    },

    function getInheritedProperties(classId) {
      var cls = this.getClass(classId);
      if ( ! cls ) return [];
      var own = {};
      var ownProps = cls.getOwnAxiomsByClass(foam.lang.Property);
      for ( var i = 0 ; i < ownProps.length ; i++ ) own[ownProps[i].name] = true;
      var allProps = cls.getAxiomsByClass(foam.lang.Property);
      var groups = {};
      for ( var i = 0 ; i < allProps.length ; i++ ) {
        var p = allProps[i];
        if ( own[p.name] ) continue;
        var source = this.findPropertySource_(cls, p.name);
        if ( ! groups[source] ) groups[source] = [];
        groups[source].push(p);
      }
      var result = [];
      for ( var className in groups ) {
        result.push({ className: className, properties: groups[className] });
      }
      return result;
    },

    function findPropertySource_(cls, propName) {
      var parent = cls.model_.extends ? this.getClass(cls.model_.extends) : null;
      while ( parent ) {
        var ownProps = parent.getOwnAxiomsByClass(foam.lang.Property);
        for ( var i = 0 ; i < ownProps.length ; i++ ) {
          if ( ownProps[i].name === propName ) return parent.id;
        }
        parent = parent.model_.extends ? this.getClass(parent.model_.extends) : null;
      }
      return 'foam.lang.FObject';
    },

    function getJavaImportMappings() {
      return {
        'foam.core.FObject':       'foam.lang.FObject',
        'foam.core.PropertyInfo':  'foam.lang.PropertyInfo',
        'foam.core.X':             'foam.lang.X',
        'foam.core.Serializable':  'foam.lang.Serializable',
        'foam.nanos.logger.Logger':       'foam.core.logger.Logger',
        'foam.nanos.auth.LifecycleState': 'foam.core.auth.LifecycleState',
        'foam.nanos.approval.ValidationException': 'foam.lang.ValidationException'
      };
    },

    function getPropertyJavaType(classId, propName) {
      var cls = this.getClass(classId);
      if ( ! cls ) return null;
      var prop = cls.getAxiomByName(propName);
      if ( ! prop ) return null;
      var typeMap = {
        'String': 'String', 'Int': 'int', 'Long': 'long', 'Float': 'float',
        'Double': 'double', 'Boolean': 'boolean', 'Date': 'java.util.Date',
        'DateTime': 'java.util.Date', 'DateTimeUTC': 'java.util.Date',
        'Enum': 'Enum', 'Object': 'Object', 'Array': 'Object[]',
        'FObjectProperty': prop.of || 'FObject', 'Reference': 'Object'
      };
      var propType = prop.cls_ && prop.cls_.model_ ? prop.cls_.model_.name : 'Property';
      return typeMap[propType] || 'Object';
    }
  ]
});
