const time_predicate = token(
  choice(
    token(
      seq(
        optional(token(seq(/[\d]+/, "w"))),
        token(seq(/[\d]+/, "h", /[\d]+/)),
      ),
    ),
    token(
      seq(
        token(seq(/[\d]+/, "w")),
        optional(token(seq(/[\d]+/, "h"))),
        optional(token(seq(/[\d]+/, "m"))),
        optional(token(seq(/[\d]+/, "s"))),
      ),
    ),
    token(
      seq(
        optional(token(seq(/[\d]+/, "w"))),
        token(seq(/[\d]+/, "h")),
        optional(token(seq(/[\d]+/, "m"))),
        optional(token(seq(/[\d]+/, "s"))),
      ),
    ),
    token(
      seq(
        optional(token(seq(/[\d]+/, "w"))),
        optional(token(seq(/[\d]+/, "h"))),
        token(seq(/[\d]+/, "m")),
        optional(token(seq(/[\d]+/, "s"))),
      ),
    ),
    token(
      seq(
        optional(token(seq(/[\d]+/, "w"))),
        optional(token(seq(/[\d]+/, "h"))),
        optional(token(seq(/[\d]+/, "m"))),
        token(seq(/[\d]+/, "s")),
      ),
    ),
  ),
);

module.exports = grammar({
  name: "liquidsoap",

  precedences: $ => [
    [
      "uminus",
      "lpar",
      "colon",
      "dot",
      "get",
      "coloncolon",
      "minus",
      "bin3",
      "bin2",
      "bin1",
      "not",
      "or",
      "and",
      "question",
      "set",
      "coalesce",
      "yields",
      "binding",
    ],
  ],

  inline: $ => [
    $.varlpar,
    $.varlbra,
    $.subfield_lbra,
    $.subfield_lpar,
    $._def,
    $._let,
    $._parse_decoration,
  ],

  extras: $ => [$.comment, /[\p{White_Space}\r\t]+/u],

  externals: $ => [
    $._var,
    $._var_lpar,
    $._var_lbra,
    $._float_no_lbra,
    $._float_exp,
    $._no_external,
    $._parse_decorator,
    $.comment,
    $._uminus,
  ],

  rules: {
    source_file: $ => $._exprs,

    _var_lit: $ =>
      token(
        choice(
          /__+/,
          /_*\p{Alphabetic}[\p{Alphabetic}0-9_']*/u,
          /[\p{Emoji_Presentation}\p{So}]/u,
        ),
      ),

    var: $ => seq($._var_lit, $._var),

    _varlpar: $ => seq($._var_lit, $._var_lpar),
    varlpar: $ => alias($._varlpar, $.var),

    _varlbra: $ => seq($._var_lit, $._var_lbra),
    varlbra: $ => alias($._varlbra, $.var),

    _bin1: $ => token(choice("!=", "==", "<", "<=", ">", ">=", "@")),

    _bin2: $ => token(choice("+", "%", "^", "+.", "-.", "-")),

    _bin3: $ => token(choice("/", "*.", "/.", "mod", "*")),

    _optvar: $ => choice("_", $.var),

    integer: $ =>
      token(choice(/-?[\d][\d_]*/, /0[xX][\da-fA-F_]+/, /0[oO][0-7_]+/)),
    float: $ =>
      choice(
        $._float_no_lbra,
        /-?([\d][\d_]*)?\.[\d][\d_]*([eE][-+]?[\d][\d_]*)?/,
        seq($._float_exp, /[\d][\d_]*/),
      ),

    version: $ => /[\d][\d_]*\.[\d][\d_]*\.[\d][\d_]*/,

    bool: $ => choice("true", "false"),

    encoder_name: $ => /%[\p{Alphabetic}]+[\p{Alphabetic}0-9_\.]+/u,

    _encoder_param: $ =>
      choice(
        seq($.var, "=", $._expr),
        seq($.string, "=", $._expr),
        $.var,
        $.string,
        $.encoder,
      ),

    _encoder_params: $ =>
      choice($._encoder_param, seq($._encoder_param, ",", $._encoder_params)),

    encoder: $ =>
      prec.right(
        1,
        seq(
          $.encoder_name,
          optional(
            seq("(", optional(alias($._encoder_params, $.encoder_params)), ")"),
          ),
        ),
      ),

    time_predicate: $ => time_predicate,

    time_interval: $ =>
      token(
        seq(
          alias(time_predicate, $.time_predicate),
          "-",
          alias(time_predicate, $.time_predicate),
        ),
      ),

    regexp: $ =>
      seq(
        "r/",
        repeat(
          choice(
            token.immediate(/[^\\/]+/),
            $._escape_sequence,
            $._no_external,
          ),
        ),
        "/",
        /[gismu]*/,
      ),

    string_interpolation: $ => seq("#{", $._expr, "}"),

    string: $ => choice($._double_quote_string, $._single_quote_string),

    _double_quote_string: $ =>
      seq(
        '"',
        repeat(
          choice(
            token.immediate(/[^\\"#]+/),
            token.immediate(/#[^{"]?/),
            $.string_interpolation,
            $._escape_sequence,
            token.immediate("\\\n"),
            $._no_external,
          ),
        ),
        '"',
      ),

    _single_quote_string: $ =>
      seq(
        "'",
        repeat(
          choice(
            token.immediate(/[^\\'#]+/),
            token.immediate(/#[^{']?/),
            $.string_interpolation,
            $._escape_sequence,
            token.immediate("\\\n"),
            $._no_external,
          ),
        ),
        "'",
      ),

    _escape_sequence: $ => token.immediate(/\\./),
    _expr_sep: $ => ";",

    _exprs: $ =>
      choice(
        seq("open", $._expr, optional($._expr_sep), $._exprs),
        seq($._expr, optional($._expr_sep)),
        seq($._expr, optional($._expr_sep), $._exprs),
        seq($._binding, optional($._expr_sep)),
        seq($._binding, optional($._expr_sep), $._exprs),
      ),

    _simple_fun_body: $ =>
      choice(
        seq("open", $._expr, optional($._expr_sep), $._exprs),
        seq($._expr, optional($._expr_sep)),
        seq($._expr, optional($._expr_sep), $._exprs),
        seq($._explicit_binding, optional($._expr_sep)),
        seq($._explicit_binding, optional($._expr_sep), $._exprs),
      ),

    arglist: $ =>
      choice(
        seq("(", seq(repeat(seq($._arg, ",")), $._arg, optional(",")), ")"),
        seq("(", ")"),
      ),

    _opt: $ => seq("=", $._expr),

    anonymous_argument: $ =>
      choice(
        seq($._pattern, optional($._opt)),
        seq("(", $._pattern, ":", $.type, ")", optional($._opt)),
      ),

    labeled_argument: $ =>
      choice(
        seq("~", field("label", $.var), optional($._opt)),
        seq("~", field("label", $.var), ":", $._pattern, optional($._opt)),
        seq(
          "~",
          "(",
          field("label", $.var),
          ":",
          $.type,
          ")",
          optional($._opt),
        ),
        seq(
          "~",
          field("label", $.var),
          ":",
          "(",
          $._pattern,
          ":",
          $.type,
          ")",
          optional($._opt),
        ),
        seq("~", field("ignored_label", $.var), "=", "_"),
      ),

    argsof: $ =>
      choice(
        seq("%argsof", "(", $.var, ")"),
        seq("%argsof", "(", $.subfield, ")"),
        seq("%argsof", "(", $.varlbra, "[", $._args_of_params, "]", ")"),
        seq("%argsof", "(", $.subfield_lbra, "[", $._args_of_params, "]", ")"),
      ),

    _arg: $ => choice($.labeled_argument, $.anonymous_argument, $.argsof),

    keep_arg: $ => $.var,
    exclude_arg: $ => seq("!", $.var),

    _args_of_params: $ =>
      choice(
        $.keep_arg,
        $.exclude_arg,
        seq($.keep_arg, ",", $._args_of_params),
        seq($.exclude_arg, ",", $._args_of_params),
      ),

    _def_decoration: $ => choice("rec", "replaces"),

    _def: $ => seq("def", optional(alias($._def_decoration, $.let_decoration))),

    def: $ =>
      choice(
        seq(
          $._def,
          "(",
          field("defined", $._optvar),
          ":",
          field("type", $.type),
          ")",
          optional("="),
          alias($._exprs, $.definition),
          alias("end", "def_end"),
        ),
        seq(
          $._def,
          field("defined", $._optvar),
          optional("="),
          alias($._exprs, $.definition),
          alias("end", "def_end"),
        ),
        seq(
          $._def,
          field("defined", $.subfield),
          optional("="),
          alias($._exprs, $.definition),
          alias("end", "def_end"),
        ),
        seq(
          $._def,
          seq(
            field("defined", choice($.subfield_lpar, $.varlpar)),
            field("arguments", $.arglist),
          ),
          optional("="),
          alias($._exprs, $.definition),
          alias("end", "def_end"),
        ),
      ),

    _let_decoration: $ => choice("eval", "replaces"),

    _parse_decoration_el: $ => prec(1, choice($.var, seq($.var, "=", $._expr))),

    _parse_decoration_args: $ =>
      seq(repeat(seq($._parse_decoration_el, ",")), $._parse_decoration_el),

    _parse_decoration: $ =>
      seq(
        $._parse_decorator,
        optional(seq("[", optional($._parse_decoration_args), "]")),
      ),

    _let: $ =>
      choice(
        "let",
        seq("let", alias($._let_decoration, $.let_decoration)),
        seq("let", alias($._parse_decoration, $.let_decoration)),
      ),

    let: $ =>
      choice(
        seq(
          $._let,
          field("defined", $.subfield),
          "=",
          alias($._expr, $.definition),
        ),
        seq(
          $._let,
          field("defined", $._pattern),
          "=",
          alias($._expr, $.definition),
        ),
        seq(
          $._let,
          "(",
          field("defined", $._pattern),
          ":",
          field("type", $.type),
          ")",
          "=",
          alias($._expr, $.definition),
        ),
      ),

    _explicit_binding: $ => choice($.let, $.def),

    binding: $ =>
      seq(field("defined", $._optvar), "=", alias($._expr, $.definition)),

    _binding: $ => prec("binding", choice($._explicit_binding, $.binding)),

    _pattern_list: $ =>
      choice($._pattern, seq($._pattern_list, ",", $._pattern)),

    spread: $ => seq(alias("...", $.op), optional($._optvar)),

    _pattern_list_with_spread: $ =>
      choice(
        $.spread,
        $._pattern_list,
        seq($.spread, ",", $._pattern_list),
        seq($._pattern_list, ",", $.spread),
        seq($._pattern_list, ",", $.spread, ",", $._pattern_list),
      ),

    tuple_pattern: $ => seq("(", optional($._pattern_list), ")"),

    list_pattern: $ => seq("[", $._pattern_list_with_spread, "]"),

    _meth_pattern_el: $ =>
      choice($.var, seq($.var, "?"), seq($.var, "=", $._pattern)),

    _meth_pattern_list: $ =>
      choice(
        $._meth_pattern_el,
        seq($._meth_pattern_el, ",", $._meth_pattern_list),
      ),

    _record_pattern: $ => seq("{", optional($._meth_pattern_list), "}"),

    _record_spread_pattern: $ => seq("{", $._meth_spread_list, "}"),

    _meth_spread_list: $ =>
      prec.left(
        1,
        choice(
          seq(alias("...", $.op), optional($._optvar)),
          seq($._meth_pattern_el, ",", $._meth_spread_list),
        ),
      ),

    meth_pattern: $ =>
      choice(
        $._record_spread_pattern,
        $._record_pattern,
        seq($.var, ".", $._record_pattern),
        seq("_", ".", $._record_pattern),
        seq($.tuple_pattern, ".", $._record_pattern),
        seq($.list_pattern, ".", $._record_pattern),
      ),

    _pattern: $ =>
      choice($._optvar, $.tuple_pattern, $.list_pattern, $.meth_pattern),

    type: $ =>
      choice(
        "_",
        $.var,
        seq($.type, "?"),
        seq("[", $.type, "]"),
        seq("[", $.type, "]", "as", "json.object"),
        prec("lpar", seq("(", $.tuple_type, ")")),
        prec.right(
          "yields",
          seq("(", optional($.args_type), ")", "->", $.type),
        ),
        seq("{", optional($.record_type), "}"),
        seq($.type, ".", $.var),
        seq($.type, ".", "{", optional($.record_type), "}"),
        $.source_type,
      ),

    record_type: $ => seq(repeat(seq($.meth_type, ",")), $.meth_type),

    meth_type: $ =>
      choice(
        seq($.var, ":", $.type),
        seq($.var, "?", ":", $.type),
        seq($.string, "as", $.var, ":", $.type),
        seq($.string, "as", $.var, "?", ":", $.type),
      ),

    source_type: $ =>
      choice(
        seq($.varlpar, "(", ")"),
        seq($.varlpar, "(", $.source_tracks_type, ")"),
      ),

    source_tracks_type: $ =>
      choice(
        seq($.var, "=", $.content_type),
        "...",
        seq($.var, "=", $.content_type, ",", $.source_tracks_type),
      ),

    content_type: $ =>
      choice(
        $.var,
        seq($.var, ".", $.var),
        seq($.var, ".", $.var, ".", $.var),
        seq($.varlpar, "(", optional($.content_args_type), ")"),
        seq($.var, ".", $.varlpar, "(", optional($.content_args_type), ")"),
        seq(
          $.var,
          ".",
          $.var,
          ".",
          $.varlpar,
          "(",
          optional($.content_args_type),
          ")",
        ),
      ),

    content_args_type: $ =>
      seq(repeat(seq($.content_arg_type, ",")), $.content_arg_type),

    content_arg_type: $ =>
      choice(
        $.var,
        $.string,
        $.integer,
        $.float,
        seq($.var, "=", $.var),
        seq($.var, "=", $.string),
        seq($.var, "=", $.integer),
        seq($.var, "=", $.float),
      ),

    tuple_type: $ =>
      choice(seq($.type, "*", $.type), seq($.type, "*", $.tuple_type)),

    arg_type: $ =>
      choice($.type, seq($.var, ":", $.type), seq("?", $.var, ":", $.type)),

    args_type: $ => seq(repeat(seq($.arg_type, ",")), $.arg_type),

    subfield: $ => seq($.var, ".", $._in_subfield),
    _in_subfield: $ =>
      choice(
        alias($.var, $.method),
        seq(alias($.var, $.method), ".", $._in_subfield),
      ),

    _subfield_lbra: $ => seq($.var, ".", $._in_subfield_lbra),
    _in_subfield_lbra: $ =>
      choice(
        alias($.varlbra, $.method),
        seq(alias($.var, $.method), ".", $._in_subfield_lbra),
      ),

    subfield_lbra: $ => alias($._subfield_lbra, $.subfield),

    _subfield_lpar: $ => seq($.var, ".", $._in_subfield_lpar),
    _in_subfield_lpar: $ =>
      choice(
        alias($.varlpar, $.method),
        seq(alias($.var, $.method), ".", $._in_subfield_lpar),
      ),

    subfield_lpar: $ => alias($._subfield_lpar, $.subfield),

    _included: $ => choice(seq("<", /[^\\>]*/, ">"), seq('"', /[^\\"]*/, '"')),

    include: $ => seq(choice("%include", "%include_extra"), $._included),

    if_def: $ =>
      seq(
        choice("%ifdef", "%ifndef"),
        choice($.var, $.subfield),
        $._exprs,
        optional(seq("%else", $._exprs)),
        "%endif",
      ),

    if_encoder: $ =>
      seq(
        choice("%ifencoder", "%ifnencoder"),
        $.encoder,
        $._exprs,
        optional(seq("%else", $._exprs)),
        "%endif",
      ),

    if_version: $ =>
      seq(
        "%ifversion",
        choice("==", ">=", "<=", ">", "<"),
        choice($.integer, $.float, $.version),
        $._exprs,
        optional(seq("%else", $._exprs)),
        "%endif",
      ),

    _inner_list_spread: $ => seq(alias("...", $.op), optional($._expr)),

    _inner_list_item: $ =>
      choice(alias($._inner_list_spread, $.spread), $._expr),

    _inner_list: $ =>
      seq(
        repeat(seq($._inner_list_item, ",")),
        $._inner_list_item,
        optional(","),
      ),

    list: $ => seq("[", optional($._inner_list), "]"),

    _inner_tuple: $ =>
      choice(seq($._expr, ",", $._expr), seq($._expr, ",", $._inner_tuple)),

    record_entry: $ =>
      choice(
        seq("...", $._expr),
        seq(
          field("name", alias($.var, $.method)),
          "=",
          field("value", $._expr),
        ),
      ),

    _record: $ =>
      prec.left(1, choice($.record_entry, seq($._record, ",", $.record_entry))),

    named_arg: $ => seq(field("name", $.var), "=", field("value", $._expr)),

    _app_list_elem: $ =>
      choice(
        $.named_arg,
        alias($._expr, $.anonymous_arg),
        seq("%argsof", "(", $.var, ")"),
        seq("%argsof", "(", $.subfield, ")"),
        seq("%argsof", "(", $.varlbra, "[", $._args_of_params, "]", ")"),
        seq("%argsof", "(", $.subfield_lbra, "[", $._args_of_params, "]", ")"),
      ),

    _app_list: $ =>
      choice($._app_list_elem, seq($._app_list_elem, ",", $._app_list)),

    method_app: $ =>
      seq(field("name", $.varlpar), "(", optional($._app_list), ")"),

    _invoked: $ => choice(alias($.var, $.method), $.method_app),

    tuple: $ => seq("(", optional($._inner_tuple), ")"),

    anonymous_function: $ =>
      prec("yields", seq("fun", $.arglist, "->", $._expr)),

    if: $ =>
      seq(
        "if",
        alias($._exprs, $.if_condition),
        "then",
        alias($._exprs, $.if_then),
        repeat(
          seq(
            "elsif",
            alias($._exprs, $.elsif_condition),
            "then",
            alias($._exprs, $.elsif_then),
          ),
        ),
        optional(seq("else", alias($._exprs, $.if_else))),
        alias("end", "if_end"),
      ),
    inline_if: $ =>
      prec.right(
        "question",
        seq(
          field("cond", $._expr),
          "?",
          field("if_true", $._expr),
          ":",
          field("if_false", $._expr),
        ),
      ),

    get: $ => prec("get", seq("!", $._expr)),
    set: $ =>
      prec.right(
        "set",
        seq(
          field("reference", $._expr),
          alias(":=", $.op),
          field("value", $._expr),
        ),
      ),

    _record_definition: $ =>
      choice(seq("{", $._record, optional(","), "}"), seq("{", "}")),

    record: $ =>
      choice(
        prec.left(
          "dot",
          seq(field("base", $._expr), ".", $._record_definition),
        ),
        $._record_definition,
      ),

    coerce: $ => seq("(", $._expr, alias(":", $.op), $.type, ")"),
    parens: $ => seq("(", $._expr, ")"),
    not: $ => prec("not", seq("not", $._expr)),
    invoke: $ =>
      choice(
        seq($._expr, ".", $._invoked),
        prec("question", seq($._expr, "?.", $._invoked)),
      ),

    app: $ => seq(field("name", $.varlpar), "(", optional($._app_list), ")"),

    append: $ =>
      prec.right("coloncolon", seq($._expr, alias("::", $.op), $._expr)),

    assoc: $ =>
      choice(
        seq($.varlbra, "[", $._expr, "]"),
        seq($._expr, ".", $.varlbra, "[", $._expr, "]"),
      ),
    block: $ => seq("begin", $._exprs, alias("end", "block_end")),
    simple_fun: $ => seq("{", $._simple_fun_body, "}"),
    while: $ =>
      seq(
        "while",
        $._expr,
        "do",
        alias($._exprs, $.while_do),
        alias("end", "while_end"),
      ),
    for: $ =>
      choice(
        seq(
          "for",
          alias($._optvar, $.for_var),
          "=",
          alias($._expr, $.for_from),
          "to",
          alias($._expr, $.for_to),
          "do",
          alias($._exprs, $.for_do),
          alias("end", "for_end"),
        ),
        seq(
          "for",
          alias($._optvar, $.for_var),
          "=",
          alias($._expr, $.for_iteration),
          "do",
          alias($._exprs, $.for_do),
          alias("end", "for_end"),
        ),
      ),
    coalesce: $ =>
      prec.left("coalesce", seq($._expr, alias("??", $.op), $._expr)),
    try: $ =>
      choice(
        seq(
          "try",
          alias($._exprs, $.try_body),
          "finally",
          alias($._exprs, $.try_finqlly),
          "end",
        ),
        seq(
          "try",
          alias($._exprs, $.try_body),
          "catch",
          field("catch", $._optvar),
          ":",
          field("in", $.list),
          "do",
          alias($._exprs, $.try_do),
          optional(seq("finally", alias($._exprs, $.try_finally))),
          alias("end", "try_end"),
        ),
        seq(
          "try",
          alias($._exprs, $.try_body),
          "catch",
          field("catch", $._optvar),
          "do",
          alias($._exprs, $.try_do),
          optional(seq("finally", alias($._exprs, $.try_finally))),
          alias("end", "for_end"),
        ),
      ),

    and: $ => prec.left("and", seq($._expr, "and", $._expr)),
    or: $ => prec.left("or", seq($._expr, "or", $._expr)),

    _minus: $ => prec("uminus", seq($._uminus, $._expr)),

    infix: $ =>
      choice(
        prec.left("bin1", seq($._expr, alias($._bin1, $.op), $._expr)),
        prec.left("bin2", seq($._expr, alias($._bin2, $.op), $._expr)),
        prec.left("bin3", seq($._expr, alias($._bin3, $.op), $._expr)),
      ),

    _expr: $ =>
      choice(
        $.include,
        $.if_def,
        $.if_encoder,
        $.if_version,
        $.coerce,
        $.parens,
        $.integer,
        $.not,
        $.bool,
        $.float,
        $._minus,
        $.string,
        $.var,
        $.list,
        $.get,
        $.set,
        $.encoder,
        $.tuple,
        $.record,
        $.invoke,
        $.app,
        $.append,
        $.assoc,
        $.block,
        $.anonymous_function,
        $.simple_fun,
        $.while,
        $.for,
        $.coalesce,
        $.try,
        $.if,
        $.regexp,
        $.inline_if,
        $.and,
        $.or,
        $.infix,
        $.time_predicate,
        $.time_interval,
      ),
  },
});
