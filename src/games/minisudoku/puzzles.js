// Hard 6x6 Mini Sudoku puzzles, one per weekday. Each has exactly ONE solution
// (verified by exhaustive search) and only 8-9 given digits -- LinkedIn's
// "hard" boards have about as many. Boxes are 2 rows x 3 columns.
// Strings are 36 chars, row by row; 0 = empty.
export const PUZZLES = {
  mon: { puzzle: '500000000100000016200000000004006050', solution: '513462642135354216261543135624426351' },
  tue: { puzzle: '000001300006000200401000005000000300', solution: '256431314526563214421653635142142365' },
  wed: { puzzle: '001005006000000400000020200000500001', solution: '321645456312132456645123213564564231' },
  thu: { puzzle: '160005000100000002035000000060002000', solution: '163425524136416352235641351264642513' },
  fri: { puzzle: '006000050010300000000040000600100003', solution: '216534453216345162621345534621162453' },
};
