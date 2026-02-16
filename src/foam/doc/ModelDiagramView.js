/**
 * @license
 * Copyright 2026 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.doc',
  name: 'ModelDiagramView',
  extends: 'foam.u2.Controller',

  documentation: `Model-centric SVG diagram showing inheritance, references, and relationships.
    Set width and/or height to -1 for auto-sizing based on content.`,

  css: `
    ^ {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    ^ svg {
      background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    ^ .clickable {
      cursor: pointer;
    }

    ^ .clickable:hover rect {
      filter: brightness(0.95);
    }

    ^ .clickable:hover text {
      fill: #1e40af;
    }
  `,

  constants: {
    COLORS: {
      focus:      { fill: '#ffffff', text: '#dc2626', stroke: '#dc2626', halo: '#fecaca' },
      extends:    { fill: '#ecfdf5', text: '#065f46', stroke: '#059669' },
      implements: { fill: '#f5f3ff', text: '#5b21b6', stroke: '#7c3aed' },
      mixin:      { fill: '#fef3c7', text: '#92400e', stroke: '#f59e0b' },
      subclass:   { fill: '#f8fafc', text: '#334155', stroke: '#94a3b8' },
      reference:  { fill: '#eff6ff', text: '#1e40af', stroke: '#3b82f6' },
      relationship:{ fill: '#fdf2f8', text: '#9d174d', stroke: '#ec4899' },
      container:  { fill: '#ffffff', text: '#334155', stroke: '#e2e8f0', header: '#f8fafc' }
    },

    PILL_HEIGHT: 48,
    PILL_GAP: 4,
    CONTAINER_PADDING: 12,
    GRID_GAP: 8,
    MARGIN: 30,

    // Cell sizes
    INHERITANCE_PILL_WIDTH: 200,
    FOCUS_PILL_WIDTH: 220,
    SIDE_CONTAINER_WIDTH: 260,
    SUBCLASS_CELL_WIDTH: 180,
    RELATIONSHIP_CELL_WIDTH: 150
  },

  properties: [
    {
      class: 'Class',
      name: 'data',
      documentation: 'The FOAM class to render diagram for.',
      adapt: function(_, n) {
        return foam.String.isInstance(n) ? foam.lookup(n) : n;
      }
    },
    {
      class: 'Class',
      name: 'selection',
      documentation: 'Currently selected model in the diagram.'
    },
    {
      class: 'Int',
      name: 'width',
      value: 1000,
      documentation: 'Width of the diagram. Set to -1 for auto-width based on content.'
    },
    {
      class: 'Int',
      name: 'height',
      value: -1,
      documentation: 'Height of the diagram. Set to -1 for auto-height based on content.'
    },
    {
      name: 'calculatedWidth_',
      documentation: 'Actual width after auto-sizing.'
    },
    {
      name: 'calculatedHeight_',
      documentation: 'Actual height after auto-sizing.'
    },
    {
      name: 'inheritanceStack_',
      factory: function() { return []; }
    },
    {
      name: 'subclasses_',
      factory: function() { return []; }
    },
    {
      name: 'references_',
      factory: function() { return []; }
    },
    {
      name: 'referencedBy_',
      factory: function() { return []; }
    },
    {
      name: 'relationships_',
      factory: function() { return []; }
    },
    // Layout calculations
    {
      name: 'gridCols_',
      documentation: 'Number of columns for relationship and subclass grids.'
    }
  ],

  methods: [
    function render() {
      this.SUPER();

      // Move all models from UNUSED to USED so that we can include them
      for ( var key in foam.UNUSED ) try { foam.lookup(key); } catch(x) {}

      var self = this;

      if ( ! this.data ) {
        this.add('No model specified');
        return;
      }

      this.buildData_();
      this.calculateLayout_();

      this
        .addClass()
        .start('svg')
          .attrs({
            width: this.calculatedWidth_,
            height: this.calculatedHeight_,
            viewBox: `0 0 ${this.calculatedWidth_} ${this.calculatedHeight_}`
          })
          .call(function() { self.renderDiagram_(this); })
        .end();
    },

    function buildData_() {
      var cls = this.data;

      // Build inheritance stack by walking up extends chain
      this.inheritanceStack_ = [];

      var current = cls;
      var visited = new Set();

      while ( current && current !== foam.core.FObject && current !== foam.lang.FObject && !visited.has(current.id) ) {
        visited.add(current.id);

        if ( current.model_.implements ) {
          current.model_.implements.forEach(impl => {
            var implCls = foam.maybeLookup(impl.path);
            if ( implCls ) {
              this.inheritanceStack_.unshift({ cls: implCls, type: 'implements' });
            }
          });
        }

        if ( current.model_.mixins ) {
          current.model_.mixins.forEach(mixin => {
            var mixinCls = foam.maybeLookup(mixin.path);
            if ( mixinCls ) {
              this.inheritanceStack_.unshift({ cls: mixinCls, type: 'mixin' });
            }
          });
        }

        if ( current !== cls ) {
          this.inheritanceStack_.unshift({ cls: current, type: 'extends' });
        }

        current = foam.maybeLookup(current.model_.extends);
      }

      var fobject = foam.maybeLookup('foam.lang.FObject') || foam.maybeLookup('foam.core.FObject');
      if ( fobject ) {
        this.inheritanceStack_.unshift({ cls: fobject, type: 'extends' });
      }

      // Subclasses
      this.subclasses_ = [];
      if ( foam.USED ) {
        Object.values(foam.USED).forEach(usedCls => {
          try {
            usedCls = foam.lookup(usedCls.id);
            if ( usedCls.__proto__ === cls ) {
              this.subclasses_.push(usedCls);
            }
          } catch (x) {}
        });
        this.subclasses_.sort((a, b) => a.name.localeCompare(b.name));
      }

      // References
      this.references_ = [];
      var seenRefs = new Set();
      cls.getAxiomsByClass(foam.lang.Property).forEach(prop => {
        var targetCls = null;
        var cardinality = '1';

        if ( foam.lang.FObjectProperty && foam.lang.FObjectProperty.isInstance(prop) && prop.of ) {
          targetCls = foam.maybeLookup(prop.of);
        } else if ( foam.lang.FObjectArray && foam.lang.FObjectArray.isInstance(prop) && prop.of ) {
          targetCls = foam.maybeLookup(prop.of);
          cardinality = '*';
        } else if ( foam.dao.Relationship && foam.dao.Relationship.isInstance(prop) ) {
          return;
        }

        if ( targetCls && ! seenRefs.has(targetCls.id) ) {
          seenRefs.add(targetCls.id);
          this.references_.push({ cls: targetCls, cardinality: cardinality, prop: prop.name });
        }
      });

      // Referenced By
      this.referencedBy_ = [];
      var seenRefBy = new Set();
      if ( foam.USED ) {
        var clsId = cls.id;
        Object.values(foam.USED).forEach(usedCls => {
          if ( ! usedCls.getAxiomsByClass ) return;
          usedCls.getAxiomsByClass(foam.lang.Property).forEach(prop => {
            var targetId = null;
            var cardinality = '1';

            if ( foam.lang.FObjectProperty && foam.lang.FObjectProperty.isInstance(prop) ) {
              targetId = prop.of;
            } else if ( foam.lang.FObjectArray && foam.lang.FObjectArray.isInstance(prop) ) {
              targetId = prop.of;
              cardinality = '*';
            }

            if ( targetId === clsId && ! seenRefBy.has(usedCls.id) ) {
              seenRefBy.add(usedCls.id);
              this.referencedBy_.push({ cls: usedCls, cardinality: cardinality, prop: prop.name });
            }
          });
        });
        this.referencedBy_.sort((a, b) => a.cls.name.localeCompare(b.cls.name));
      }

      // Relationships
      this.relationships_ = [];
      var seenRels = new Set();
      var rels = cls.getAxiomsByClass(foam.dao.Relationship) || [];
      rels.forEach(rel => {
        var otherCls = null;
        var direction = '';
        if ( rel.sourceModel === cls.id ) {
          otherCls = foam.maybeLookup(rel.targetModel);
          direction = 'to';
        } else if ( rel.targetModel === cls.id ) {
          otherCls = foam.maybeLookup(rel.sourceModel);
          direction = 'from';
        }
        if ( otherCls && ! seenRels.has(otherCls.id) ) {
          seenRels.add(otherCls.id);
          this.relationships_.push({
            cls: otherCls,
            cardinality: rel.cardinality || '*:*',
            name: rel.name,
            direction: direction
          });
        }
      });
    },

    function calculateLayout_() {
      var M = this.MARGIN;
      var sideItemHeight = this.PILL_HEIGHT + this.PILL_GAP;

      // Determine effective width
      var effectiveWidth = this.width > 0 ? this.width : 1200; // default if auto

      // Calculate available width for center content
      var hasBottomContent = this.relationships_.length > 0 || this.subclasses_.length > 0;
      var hasLeft = this.referencedBy_.length > 0;
      var hasRight = this.references_.length > 0;

      var centerWidth;
      if ( ! hasBottomContent ) {
        // No bottom content, doesn't matter
        centerWidth = effectiveWidth - 2 * M;
      } else if ( hasLeft && hasRight ) {
        // Both sides, center content is squeezed
        centerWidth = effectiveWidth - 2 * (this.SIDE_CONTAINER_WIDTH + M + 20);
      } else if ( hasLeft || hasRight ) {
        // Only one side - we shift center, so we only lose space on one side
        centerWidth = effectiveWidth - (this.SIDE_CONTAINER_WIDTH + M + 20) - M;
      } else {
        // No side containers
        centerWidth = effectiveWidth - 2 * M;
      }

      // Calculate grid columns based on available center width
      var cellTotal = this.SUBCLASS_CELL_WIDTH + this.GRID_GAP;
      this.gridCols_ = Math.max(1, Math.floor((centerWidth - this.CONTAINER_PADDING * 2) / cellTotal));

      // Calculate inheritance stack height
      var stackHeight = this.inheritanceStack_.length * (this.PILL_HEIGHT + this.PILL_GAP);

      var focusY = M + stackHeight;

      // Calculate heights for each section
      var relRows = this.relationships_.length > 0 ? Math.ceil(this.relationships_.length / this.gridCols_) : 0;
      var relCellHeight = this.PILL_HEIGHT + this.GRID_GAP;
      var relHeight = relRows > 0 ? relRows * relCellHeight + 50 : 0;

      var subRows = this.subclasses_.length > 0 ? Math.ceil(this.subclasses_.length / this.gridCols_) : 0;
      var subCellHeight = this.PILL_HEIGHT + this.GRID_GAP;
      var subHeight = subRows > 0 ? subRows * subCellHeight + 50 : 0;

      // Calculate total height
      var totalHeight = focusY + this.PILL_HEIGHT; // inheritance + focus
      if ( relHeight > 0 ) totalHeight += 40 + relHeight; // gap + relationships
      if ( subHeight > 0 ) totalHeight += 25 + subHeight; // gap + subclasses
      totalHeight += M; // bottom margin

      // Side container height check
      var maxSideItems = Math.max(this.references_.length, this.referencedBy_.length);
      var sideHeight = maxSideItems * sideItemHeight + 50;
      var sideTop = Math.max(M, focusY - sideHeight + this.PILL_HEIGHT + 30);

      // Ensure height accommodates side containers
      var sideBottom = sideTop + sideHeight;
      if ( sideBottom > totalHeight - M ) {
        totalHeight = sideBottom + M;
      }

      // Set calculated dimensions
      this.calculatedWidth_ = this.width > 0 ? this.width : effectiveWidth;
      this.calculatedHeight_ = this.height > 0 ? this.height : totalHeight;
    },

    function renderDiagram_(svg) {
      var self = this;
      var M = this.MARGIN;

      // Center the main content, but shift if only one side container
      var hasLeft = this.referencedBy_.length > 0;
      var hasRight = this.references_.length > 0;
      var hasBottomContent = this.relationships_.length > 0 || this.subclasses_.length > 0;

      var centerX;
      if ( hasBottomContent && hasLeft && !hasRight ) {
        // Only left container, shift center right
        centerX = this.calculatedWidth_ / 2 + (this.SIDE_CONTAINER_WIDTH + M) / 2;
      } else if ( hasBottomContent && hasRight && !hasLeft ) {
        // Only right container, shift center left
        centerX = this.calculatedWidth_ / 2 - (this.SIDE_CONTAINER_WIDTH + M) / 2;
      } else {
        centerX = this.calculatedWidth_ / 2;
      }

      // Calculate stack height
      var stackHeight = this.inheritanceStack_.length * (this.PILL_HEIGHT + this.PILL_GAP);

      var focusY = M + stackHeight;

      this.renderInheritanceStack_(svg, centerX, M);
      this.renderFocusClass_(svg, centerX, focusY);

      var sideItemHeight = this.PILL_HEIGHT + this.PILL_GAP;
      var containerTop = focusY + this.PILL_HEIGHT + 40;

      // Referenced By (left)
      if ( this.referencedBy_.length > 0 ) {
        var refByHeight = this.referencedBy_.length * sideItemHeight + 50;
        var refByTop = Math.max(M, focusY - refByHeight + this.PILL_HEIGHT + 30);
        this.renderContainer_(svg, M, refByTop, this.SIDE_CONTAINER_WIDTH, refByHeight,
          'Referenced By', this.referencedBy_, 'reference');

        svg.start('path')
          .attrs({
            d: `M ${centerX - this.FOCUS_PILL_WIDTH/2} ${focusY + this.PILL_HEIGHT/2} L ${M + this.SIDE_CONTAINER_WIDTH} ${focusY + this.PILL_HEIGHT/2}`,
            fill: 'none',
            stroke: '#cbd5e1',
            'stroke-width': 1.5
          })
        .end();
      }

      // References (right) - always position from right edge
      if ( this.references_.length > 0 ) {
        var refHeight = this.references_.length * sideItemHeight + 50;
        var refTop = Math.max(M, focusY - refHeight + this.PILL_HEIGHT + 30);
        var refX = this.calculatedWidth_ - this.SIDE_CONTAINER_WIDTH - M;
        this.renderContainer_(svg, refX, refTop,
          this.SIDE_CONTAINER_WIDTH, refHeight, 'References', this.references_, 'reference');

        svg.start('path')
          .attrs({
            d: `M ${centerX + this.FOCUS_PILL_WIDTH/2} ${focusY + this.PILL_HEIGHT/2} L ${refX} ${focusY + this.PILL_HEIGHT/2}`,
            fill: 'none',
            stroke: '#cbd5e1',
            'stroke-width': 1.5
          })
        .end();
      }

      // Relationships
      var relTop = containerTop;
      if ( this.relationships_.length > 0 ) {
        var relRows = Math.ceil(this.relationships_.length / this.gridCols_);
        var relHeight = relRows * sideItemHeight + 50;
        var relWidth = this.gridCols_ * (this.SUBCLASS_CELL_WIDTH + this.GRID_GAP) - this.GRID_GAP + this.CONTAINER_PADDING * 2;

        this.renderRelationshipContainer_(svg, centerX - relWidth/2, relTop, relWidth, relHeight);

        svg.start('path')
          .attrs({
            d: `M ${centerX} ${focusY + this.PILL_HEIGHT} L ${centerX} ${relTop}`,
            fill: 'none',
            stroke: '#cbd5e1',
            'stroke-width': 1.5
          })
        .end();

        relTop += relHeight + 20;
      }

      // Subclasses
      if ( this.subclasses_.length > 0 ) {
        var subTop = relTop + 5;
        var subRows = Math.ceil(this.subclasses_.length / this.gridCols_);
        var subCellHeight = this.PILL_HEIGHT_WITH_PKG + this.GRID_GAP;
        var subHeight = subRows * subCellHeight + 50;
        var subWidth = this.gridCols_ * (this.SUBCLASS_CELL_WIDTH + this.GRID_GAP) - this.GRID_GAP + this.CONTAINER_PADDING * 2;

        this.renderSubclassContainer_(svg, centerX - subWidth/2, subTop, subWidth, subHeight);

        var lineStartY = this.relationships_.length > 0 ? relTop - 20 : focusY + this.PILL_HEIGHT;
        svg.start('path')
          .attrs({
            d: `M ${centerX} ${lineStartY} L ${centerX} ${subTop}`,
            fill: 'none',
            stroke: '#cbd5e1',
            'stroke-width': 1.5
          })
        .end();
      }
    },

    function renderInheritanceStack_(svg, centerX, startY) {
      var y = startY;

      this.inheritanceStack_.forEach(item => {
        var colors = this.COLORS[item.type] || this.COLORS.extends;
        var hasType = item.type !== 'extends';

        this.renderPillWithPackage_(svg, centerX - this.INHERITANCE_PILL_WIDTH/2, y,
          this.INHERITANCE_PILL_WIDTH, this.PILL_HEIGHT, item.cls, colors, hasType ? item.type : null);
        y += this.PILL_HEIGHT + this.PILL_GAP;
      });
    },

    function renderFocusClass_(svg, centerX, y) {
      var colors = this.COLORS.focus;

      svg
        .start('g')
          .start('rect')
            .attrs({
              x: centerX - this.FOCUS_PILL_WIDTH/2 - 4,
              y: y - 4,
              width: this.FOCUS_PILL_WIDTH + 8,
              height: this.PILL_HEIGHT + 8,
              rx: 10,
              fill: colors.halo
            })
          .end()
          .start('rect')
            .attrs({
              x: centerX - this.FOCUS_PILL_WIDTH/2,
              y: y,
              width: this.FOCUS_PILL_WIDTH,
              height: this.PILL_HEIGHT,
              rx: 8,
              fill: colors.fill,
              stroke: colors.stroke,
              'stroke-width': 2
            })
          .end()
          .start('text')
            .attrs({
              x: centerX,
              y: y + this.PILL_HEIGHT/2,
              'text-anchor': 'middle',
              'dominant-baseline': 'middle',
              'font-size': '14px',
              'font-weight': '600',
              fill: colors.text
            })
            .add(this.data.name)
          .end()
        .end();
    },

    function renderPill_(svg, x, y, width, height, text, colors, cls, type) {
      var self = this;
      var isSelected = this.selection && this.selection.id === cls.id;

      svg
        .start('g')
          .addClass('clickable')
          .on('click', function() { self.selection = cls; })
          .start('title').add(cls.id).end()
          .start('rect')
            .attrs({
              x: x,
              y: y,
              width: width,
              height: height,
              rx: 6,
              fill: isSelected ? colors.stroke : colors.fill,
              stroke: colors.stroke,
              'stroke-width': isSelected ? 2 : 1
            })
          .end()
          .start('text')
            .attrs({
              x: x + width/2,
              y: y + (type ? height/2 - 6 : height/2),
              'text-anchor': 'middle',
              'dominant-baseline': 'middle',
              'font-size': '12px',
              'font-weight': '500',
              fill: isSelected ? colors.fill : colors.text
            })
            .add(text)
          .end()
          .callIf(type, function() {
            this.start('text')
              .attrs({
                x: x + width/2,
                y: y + height/2 + 8,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': '9px',
                'font-style': 'italic',
                fill: isSelected ? colors.fill : colors.stroke
              })
              .add(type)
            .end();
          })
        .end();
    },

    function renderPillWithPackage_(svg, x, y, width, height, cls, colors, type) {
      var self = this;
      var isSelected = this.selection && this.selection.id === cls.id;
      var pkg = cls.package || '';
      var name = cls.name;

      var maxPkgLen = Math.floor(width / 6);
      var displayPkg = pkg.length > maxPkgLen ? '…' + pkg.slice(-(maxPkgLen - 1)) : pkg;

      var maxNameLen = Math.floor(width / 7);
      var displayName = name.length > maxNameLen ? name.slice(0, maxNameLen - 1) + '…' : name;

      // If type is provided, show: package, name, type (3 lines)
      // Otherwise show: package, name (2 lines)
      var nameY = type ? y + height/2 : y + height/2 + 4;
      var pkgY = type ? y + height/2 - 12 : y + height/2 - 8;

      svg
        .start('g')
          .addClass('clickable')
          .on('click', function() { self.selection = cls; })
          .start('title').add(cls.id).end()
          .start('rect')
            .attrs({
              x: x,
              y: y,
              width: width,
              height: height,
              rx: 6,
              fill: isSelected ? colors.stroke : colors.fill,
              stroke: colors.stroke,
              'stroke-width': isSelected ? 2 : 1
            })
          .end()
          .start('text')
            .attrs({
              x: x + width/2,
              y: pkgY,
              'text-anchor': 'middle',
              'dominant-baseline': 'middle',
              'font-size': '9px',
              fill: isSelected ? colors.fill : '#64748b'
            })
            .add(displayPkg)
          .end()
          .start('text')
            .attrs({
              x: x + width/2,
              y: nameY,
              'text-anchor': 'middle',
              'dominant-baseline': 'middle',
              'font-size': '11px',
              'font-weight': '500',
              fill: isSelected ? colors.fill : colors.text
            })
            .add(displayName)
          .end()
          .callIf(type, function() {
            this.start('text')
              .attrs({
                x: x + width/2,
                y: y + height/2 + 12,
                'text-anchor': 'middle',
                'dominant-baseline': 'middle',
                'font-size': '9px',
                'font-style': 'italic',
                fill: isSelected ? colors.fill : colors.stroke
              })
              .add(type)
            .end();
          })
        .end();
    },

    function renderContainer_(svg, x, y, width, height, title, items, type) {
      var self = this;
      var colors = this.COLORS.container;
      var itemColors = this.COLORS[type] || this.COLORS.reference;

      svg
        .start('g')
          .start('rect')
            .attrs({ x: x, y: y, width: width, height: height, rx: 10,
              fill: colors.fill, stroke: colors.stroke, 'stroke-width': 1 })
          .end()
          .start('rect')
            .attrs({ x: x, y: y, width: width, height: 32, rx: 10, fill: colors.header })
          .end()
          .start('rect')
            .attrs({ x: x, y: y + 22, width: width, height: 10, fill: colors.header })
          .end()
          .start('text')
            .attrs({ x: x + width/2, y: y + 18, 'text-anchor': 'middle',
              'font-size': '11px', 'font-weight': '600', fill: colors.text })
            .add(title)
          .end()
          .call(function() {
            var itemY = y + 40;
            var itemWidth = width - self.CONTAINER_PADDING * 2;
            var itemHeight = self.PILL_HEIGHT;

            items.forEach(item => {
              self.renderContainerItem_(this, x + self.CONTAINER_PADDING, itemY,
                itemWidth, itemHeight, item, itemColors);
              itemY += itemHeight + self.PILL_GAP;
            });
          })
        .end();
    },

    function renderContainerItem_(svg, x, y, width, height, item, colors) {
      var self = this;
      var cls = item.cls;
      var cardinality = item.cardinality || '';
      var isSelected = this.selection && this.selection.id === cls.id;
      var pkg = cls.package || '';
      var name = cls.name;

      var maxPkgLen = Math.floor((width - 30) / 6);
      var displayPkg = pkg.length > maxPkgLen ? '…' + pkg.slice(-(maxPkgLen - 1)) : pkg;

      var maxNameLen = Math.floor((width - 30) / 7);
      var displayName = name.length > maxNameLen ? name.slice(0, maxNameLen - 1) + '…' : name;

      svg
        .start('g')
          .addClass('clickable')
          .on('click', function() { self.selection = cls; })
          .start('title').add(cls.id).end()
          .start('rect')
            .attrs({ x: x, y: y, width: width, height: height, rx: 5,
              fill: isSelected ? colors.stroke : colors.fill,
              stroke: colors.stroke, 'stroke-width': isSelected ? 2 : 1 })
          .end()
          .start('text')
            .attrs({ x: x + 8, y: y + height/2 - 8, 'dominant-baseline': 'middle',
              'font-size': '9px', fill: isSelected ? colors.fill : '#64748b' })
            .add(displayPkg)
          .end()
          .start('text')
            .attrs({ x: x + 8, y: y + height/2 + 8, 'dominant-baseline': 'middle',
              'font-size': '11px', 'font-weight': '500',
              fill: isSelected ? colors.fill : colors.text })
            .add(displayName)
          .end()
          .callIf(cardinality, function() {
            this.start('text')
              .attrs({ x: x + width - 8, y: y + height/2, 'text-anchor': 'end',
                'dominant-baseline': 'middle', 'font-size': '10px', fill: '#64748b' })
              .add(cardinality)
            .end();
          })
        .end();
    },

    function renderRelationshipContainer_(svg, x, y, width, height) {
      var self = this;
      var colors = this.COLORS.container;
      var itemColors = this.COLORS.relationship;
      var cellWidth = this.SUBCLASS_CELL_WIDTH;
      var cellHeight = this.PILL_HEIGHT;
      var cols = this.gridCols_;

      svg
        .start('g')
          .start('rect')
            .attrs({ x: x, y: y, width: width, height: height, rx: 10,
              fill: colors.fill, stroke: colors.stroke, 'stroke-width': 1 })
          .end()
          .start('rect')
            .attrs({ x: x, y: y, width: width, height: 32, rx: 10, fill: colors.header })
          .end()
          .start('rect')
            .attrs({ x: x, y: y + 22, width: width, height: 10, fill: colors.header })
          .end()
          .start('text')
            .attrs({ x: x + width/2, y: y + 18, 'text-anchor': 'middle',
              'font-size': '11px', 'font-weight': '600', fill: colors.text })
            .add('Relationships')
          .end()
          .call(function() {
            var startX = x + self.CONTAINER_PADDING;
            var startY = y + 40;

            self.relationships_.forEach((item, i) => {
              var col = i % cols;
              var row = Math.floor(i / cols);
              var itemX = startX + col * (cellWidth + self.GRID_GAP);
              var itemY = startY + row * (cellHeight + self.GRID_GAP);

              self.renderContainerItem_(this, itemX, itemY, cellWidth, cellHeight, item, itemColors);
            });
          })
        .end();
    },

    function renderSubclassContainer_(svg, x, y, width, height) {
      var self = this;
      var colors = this.COLORS.container;
      var itemColors = this.COLORS.subclass;
      var cellWidth = this.SUBCLASS_CELL_WIDTH;
      var cellHeight = this.PILL_HEIGHT;
      var cols = this.gridCols_;

      svg
        .start('g')
          .start('rect')
            .attrs({ x: x, y: y, width: width, height: height, rx: 10,
              fill: colors.fill, stroke: colors.stroke, 'stroke-width': 1 })
          .end()
          .start('rect')
            .attrs({ x: x, y: y, width: width, height: 32, rx: 10, fill: colors.header })
          .end()
          .start('rect')
            .attrs({ x: x, y: y + 22, width: width, height: 10, fill: colors.header })
          .end()
          .start('text')
            .attrs({ x: x + width/2, y: y + 18, 'text-anchor': 'middle',
              'font-size': '11px', 'font-weight': '600', fill: colors.text })
            .add('Sub-Classes (' + this.subclasses_.length + ')')
          .end()
          .call(function() {
            var startX = x + self.CONTAINER_PADDING;
            var startY = y + 40;

            self.subclasses_.forEach((cls, i) => {
              var col = i % cols;
              var row = Math.floor(i / cols);
              var itemX = startX + col * (cellWidth + self.GRID_GAP);
              var itemY = startY + row * (cellHeight + self.GRID_GAP);

              self.renderPillWithPackage_(this, itemX, itemY, cellWidth, cellHeight, cls, itemColors);
            });
          })
        .end();
    }
  ]
});
