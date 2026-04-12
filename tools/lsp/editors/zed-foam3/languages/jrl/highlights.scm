; FOAM Journal (.jrl) highlighting — reuses JSON grammar
; Keys
(pair key: (string) @property)

; String values
(pair value: (string) @string)

; Numbers
(number) @number

; Booleans and null
(true) @constant.builtin
(false) @constant.builtin
(null) @constant.builtin

; Punctuation
"{" @punctuation.bracket
"}" @punctuation.bracket
"[" @punctuation.bracket
"]" @punctuation.bracket
"," @punctuation.delimiter
":" @punctuation.delimiter
