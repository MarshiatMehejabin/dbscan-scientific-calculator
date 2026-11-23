// K(label, cmd, shiftLabel, shiftCmd, alphaLabel, alphaCmd, cssClass)
// cmd starting with "@" = action, otherwise = text inserted into the expression.
const K = (l, c, sl, sc, al, ac, cls = "f") => ({ l, c, sl, sc, al, ac, cls });
const T = "@TODO";   // feature planned, not built yet (only the ∠ key is left)

// Upper block: 6 columns. null = place for the REPLAY (D-pad) cluster.
const TOP_KEYS = [
  K("SHIFT", "@SHIFT", "", null, "", null, "sil"),
  K("ALPHA", "@ALPHA", "", null, "", null, "sil"),
  null,
  K("MODE", "@MODE", "SETUP", "@ANGLE", "", null, "sil"),
  K("ON", "@ON", "", null, "", null, "sil"),

  K("CALC", "@CALC", "SOLVE", "@SOLVE"),
  K("∫▫", "Int(", "d/dx", "dydx(", ":", null),
  K("x⁻¹", "^(-1)", "x!", "!"),
  K("logₐ▫", "logb(", "Σ", "Sum("),

  K("a b/c", "@ABC", "", null),
  K("√▫", "sqrt(", "∛", "cbrt("),
  K("x²", "^2", "x³", "^3"),
  K("xⁿ", "^", "ˣ√", "root"),
  K("log", "log(", "10ˣ", "10^("),
  K("ln", "ln(", "eˣ", "e^("),

  K("(−)", "-", "∠", T, "A", "A"),
  K("° ′ ″", "@DMS", "←", "@TODMS", "B", "B"),
  K("hyp", "@HYP", "Abs", "abs(", "C", "C"),
  K("sin", "sin(", "sin⁻¹", "asin(", "D", "D"),
  K("cos", "cos(", "cos⁻¹", "acos(", "E", "E"),
  K("tan", "tan(", "tan⁻¹", "atan(", "F", "F"),

  K("RCL", "@RCL", "STO", "@STO"),
  K("ENG", "@ENG", "←", "@ENGL", "i", "i"),
  K("(", "(", "%", "%"),
  K(")", ")", ",", ",", "X", "X"),
  K("S⇔D", "@SD", "", null, "Y", "Y"),
  K("M+", "@M+", "M−", "@M-", "M", "M")
];

// Lower block: 5 columns.
const BOTTOM_KEYS = [
  K("7", "7", "CONST", "@CONST", "", null, "n"),
  K("8", "8", "CONV", "@CONV", "", null, "n"),
  K("9", "9", "CLR", "@CLR", "", null, "n"),
  K("DEL", "@DEL", "INS", "@INS", "", null, "g"),
  K("AC", "@AC", "OFF", "@OFF", "", null, "g"),

  K("4", "4", "MATRIX", "@GO:MATRIX", "", null, "n"),
  K("5", "5", "VECTOR", "@GO:VECTOR", "", null, "n"),
  K("6", "6", "", null, "", null, "n"),
  K("×", "*", "nPr", "nPr", "", null, "n"),
  K("÷", "/", "nCr", "nCr", "", null, "n"),

  K("1", "1", "STAT", "@GO:STAT", "", null, "n"),
  K("2", "2", "CMPLX", "@GO:CMPLX", "", null, "n"),
  K("3", "3", "BASE", "@GO:BASE-N", "", null, "n"),
  K("+", "+", "Pol", "Pol(", "", null, "n"),
  K("−", "-", "Rec", "Rec(", "", null, "n"),

  K("0", "0", "Rnd", "Rnd(", "", null, "n"),
  K(".", ".", "Ran#", "@RAN", "", null, "n"),
  K("×10ˣ", "*10^", "π", "pi", "e", "e", "n"),
  K("Ans", "Ans", "DRG▸", "@DRG", "", null, "n"),
  K("=", "@EQ", "", null, "", null, "n")
];