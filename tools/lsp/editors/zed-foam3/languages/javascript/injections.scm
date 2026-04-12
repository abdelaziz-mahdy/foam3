; Inject Java highlighting into template literals following FOAM Java property keys
; Matches: javaCode: `...`, javaPreSet: `...`, javaPostSet: `...`,
;          javaFactory: `...`, javaGetter: `...`, javaSetter: `...`
(pair
  key: (property_identifier) @_key
  value: (template_string) @content
  (#match? @_key "^java(Code|PreSet|PostSet|Factory|Getter|Setter|Throws|Info)$")
  (#set! "language" "java"))
