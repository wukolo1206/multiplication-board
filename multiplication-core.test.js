/* multiplication-core.test.js — 核心邏輯回歸測試
 *
 * 期望值一律取自課本標準答案，每筆標明課本頁碼。
 * 執行：node multiplication-core.test.js
 */
'use strict';
var C = require('./multiplication-core.js');

var pass = 0, fail = 0, groupName = '';
function group(n) { groupName = n; console.log('\n── ' + n); }
function eq(label, actual, expected) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + '\n        得到 ' + a + '\n        預期 ' + e); }
}

/* =============================================================
 * 1. 課本各題的積（16 筆，每筆標明課本頁碼）
 * =========================================================== */
group('1. 課本題目的積');
[
  ['課本p20 活動1問1 整千×一位', 3000, 2, 6000],
  ['課本p21 活動1問3 四位×一位、兩次進位', 1426, 3, 4278],
  ['課本p21 活動1問4 被乘數中間有0', 2009, 6, 12054],
  ['課本p22 活動2問1 一位×整十', 8, 30, 240],
  ['課本p22 活動2問2 一位×二位', 6, 28, 168],
  ['課本p23 活動2問4 整十×整十', 40, 30, 1200],
  ['課本p24 活動2問5 二位×二位 無進位', 24, 12, 288],
  ['課本p25 活動2問6 二位×二位 有進位', 28, 74, 2072],
  ['課本p25 活動2問7 二位×整十 末位補0', 53, 80, 4240],
  ['課本p26 活動3問1① 三位×二位', 218, 39, 8502],
  ['課本p26 活動3問1② 三位×二位', 375, 46, 17250],
  ['課本p27 做做看 乘數整十＋被乘數中間有0', 605, 80, 48400],
  ['課本p27 活動3問3 被乘數中間有0', 402, 36, 14472],
  ['課本p28 問2 四位×二位', 1265, 18, 22770],
  ['課本p28 問3 四位數中間有0', 2008, 21, 42168],
  ['課本p29 練習(二)第2題① 正解', 21, 43, 903],
  ['課本p29 練習(二)第2題② 正解', 37, 52, 1924]
].forEach(function (t) {
  eq(t[0] + '　' + t[1] + '×' + t[2], C.breakdown(t[1], t[2]).product, t[3]);
});

/* =============================================================
 * 2. 逐位展開，位值敘述須對得上課本原文（課本p21）
 * =========================================================== */
group('2. 1426×3 逐位展開（課本p21 原文）');
var s = C.digitSteps(1426, 3);
// 課本：「6個一的3倍是18個一，在個位寫8，在十位上方記1。」
eq('個位 6×3=18 寫8 進1', [s[0].raw, s[0].write, s[0].carryOut], [18, 8, 1]);
// 課本：「2個十的3倍是6個十，和1個十合起來是7個十，在十位寫7。」
eq('十位 2×3=6 +進位1 =7 寫7 進0', [s[1].raw, s[1].total, s[1].write, s[1].carryOut], [6, 7, 7, 0]);
// 課本：「4個百的3倍是12個百，在百位寫2，在千位上方記1。」
eq('百位 4×3=12 寫2 進1', [s[2].raw, s[2].write, s[2].carryOut], [12, 2, 1]);
// 課本：「1個千的3倍是3個千，和1個千合起來是4個千，在千位寫4。」
eq('千位 1×3=3 +進位1 =4 寫4', [s[3].raw, s[3].total, s[3].write], [3, 4, 4]);
eq('位名依序為 個十百千', s.map(function (x) { return x.placeName; }), ['個', '十', '百', '千']);

group('2b. 2009×6 被乘數中間有0（課本p21）');
var z = C.digitSteps(2009, 6);
eq('個位 9×6=54 寫4 進5', [z[0].raw, z[0].write, z[0].carryOut], [54, 4, 5]);
eq('十位 0×6=0 +進位5 =5 寫5 進0', [z[1].digit, z[1].raw, z[1].total, z[1].write], [0, 0, 5, 5]);
eq('百位 0×6=0 寫0', [z[2].digit, z[2].write], [0, 0]);
eq('千位 2×6=12 寫2 進1', [z[3].raw, z[3].write, z[3].carryOut], [12, 2, 1]);
eq('進位溢出到萬位 寫1', [z[4].placeName, z[4].write], ['萬', 1]);

/* =============================================================
 * 3. 部分積與左移（課本p25 28×74）
 * =========================================================== */
group('3. 部分積與左移');
var r = C.partialRows(28, 74);
// 課本：「28×4=112(個一)」「28×7=196(個十)」
eq('第一列 28×4=112 不左移', [r[0].digit, r[0].value, r[0].shift, r[0].shifted], [4, 112, 0, 112]);
eq('第二列 28×7=196 左移一位＝1960', [r[1].digit, r[1].value, r[1].shift, r[1].shifted], [7, 196, 1, 1960]);
eq('兩列相加＝2072（M11 加法進位）', r[0].shifted + r[1].shifted, 2072);
eq('6×28 需要相加兩列', C.breakdown(6, 28).needsRowSum, true);
eq('53×80 個位為0 只有一列有效（課本p25）', C.breakdown(53, 80).needsRowSum, false);

/* =============================================================
 * 4. 面積模型四區塊（課本p24 24×12）
 * =========================================================== */
group('4. 面積模型四區塊');
var blocks = C.areaBlocks(24, 12);
// 課本標號：①4×2 ②20×2 ③4×10 ④20×10
eq('①4×2=8', [blocks[0].label, blocks[0].x, blocks[0].y, blocks[0].area], ['①', 4, 2, 8]);
eq('②20×2=40', [blocks[1].label, blocks[1].x, blocks[1].y, blocks[1].area], ['②', 20, 2, 40]);
eq('③4×10=40', [blocks[2].label, blocks[2].x, blocks[2].y, blocks[2].area], ['③', 4, 10, 40]);
eq('④20×10=200', [blocks[3].label, blocks[3].x, blocks[3].y, blocks[3].area], ['④', 20, 10, 200]);
eq('四塊總和＝288', blocks.reduce(function (a, b) { return a + b.area; }, 0), 288);

var merged = C.blocksToRows(24, 12);
eq('①+②＝48 為直式第一列', [merged[0].blocks, merged[0].sum], [['①', '②'], 48]);
eq('③+④＝240 為直式第二列', [merged[1].blocks, merged[1].sum], [['③', '④'], 240]);

/* =============================================================
 * 5. 逐位診斷（carry.html）
 * =========================================================== */
group('5. 逐位診斷');
function dx(w, c, d, m, ci) { return C.diagnoseDigit({ inWrite: w, inCarry: c, digit: d, multiplier: m, carryIn: ci }).code; }

// 2009×6 十位：digit=0, carryIn=5, multiplier=6，正解 寫5 進0
eq('2009×6十位 正確', dx(5, 0, 0, 6, 5), 'CORRECT');
eq('2009×6十位 漏進位（寫0進0）', dx(0, 0, 0, 6, 5), 'OMIT_CARRY');
eq('2009×6十位 把進位拿去乘（寫0進3）', dx(0, 3, 0, 6, 5), 'ZERO_DIGIT_CARRY_CONFUSION');
// 402×36 的 402×6 十位：digit=0, carryIn=1，正解 寫1 進0
eq('402×6十位 正確', dx(1, 0, 0, 6, 1), 'CORRECT');
eq('402×6十位 漏進位', dx(0, 0, 0, 6, 1), 'OMIT_CARRY');
// 無進位時不可誤判成漏進位
eq('1426×3個位 正確（無進位）', dx(8, 1, 6, 3, 0), 'CORRECT');
eq('1426×3個位 九九乘法算錯', dx(4, 2, 6, 3, 0), 'FACT_ERROR');
// 有進位的一般情形
eq('1426×3十位 正確', dx(7, 0, 2, 3, 1), 'CORRECT');
eq('1426×3十位 漏進位', dx(6, 0, 2, 3, 1), 'OMIT_CARRY');
eq('1426×3十位 先加後乘', dx(9, 0, 2, 3, 1), 'ADD_BEFORE_MUL');
// 只看寫入格會碰撞的一組（d=2,m=6,c=5）：進位格分得開
eq('碰撞組 漏進位（寫2進1）', dx(2, 1, 2, 6, 5), 'OMIT_CARRY');
eq('碰撞組 先加後乘（寫2進4）', dx(2, 4, 2, 6, 5), 'ADD_BEFORE_MUL');

group('5b. 窮舉：無死碼、無歧義');
var seen = {}, total = 0;
for (var d = 0; d < 10; d++)
  for (var m = 2; m < 10; m++)
    for (var ci = 0; ci < 10; ci++)
      for (var w = 0; w < 10; w++)
        for (var cc = 0; cc < 10; cc++) {
          var code = C.diagnoseDigit({ inWrite: w, inCarry: cc, digit: d, multiplier: m, carryIn: ci }).code;
          seen[code] = (seen[code] || 0) + 1; total++;
        }
eq('窮舉組數', total, 80000);
['CORRECT', 'OMIT_CARRY', 'ADD_BEFORE_MUL', 'ZERO_DIGIT_CARRY_CONFUSION', 'FACT_ERROR']
  .forEach(function (k) { eq('代碼可達（非死碼）: ' + k, seen[k] > 0, true); });
eq('AMBIGUOUS_CARRY 不可達（兩格輸入足以消歧義）', seen['AMBIGUOUS_CARRY'] || 0, 0);

/* =============================================================
 * 6. 列層級診斷
 * =========================================================== */
group('6. 列層級診斷');
var rows74 = C.partialRows(28, 74);
function dr(v, sh, row) { return C.diagnoseRow({ row: row, inValue: v, inShift: sh }); }
eq('第二列 196 放對位置', dr(196, 1, rows74[1]).code, 'CORRECT');
eq('第二列 196 未左移 → NO_SHIFT', dr(196, 0, rows74[1]).code, 'NO_SHIFT');
eq('第二列 算錯 → 展開該列', dr(186, 1, rows74[1]).code, 'EXPAND_ROW');
eq('兩列相加正確', C.diagnoseRowSum({ rows: rows74, inSum: 2072 }).code, 'CORRECT');
eq('兩列都對但相加錯 → SUM_ERROR', C.diagnoseRowSum({ rows: rows74, inSum: 2062 }).code, 'SUM_ERROR');

/* =============================================================
 * 7. 錯誤直式分類（fix.html，課本p29）
 * =========================================================== */
group('7. 錯誤直式分類（課本p29 原圖已核對）');
eq('21×43 同位對應相乘 → 83', C.digitwisePairingValue(21, 43), 83);
eq('37×52 第二列未左移 → 259', C.noShiftValue(37, 52), 259);
eq('37×52 未左移的兩列為 74 與 185', C.partialRows(37, 52).map(function (x) { return x.value; }), [74, 185]);
eq('同位對應相乘是「算錯」，要問第幾步', C.isStructuralError(C.WRONG_FORMS.DIGITWISE_PAIRING), false);
eq('未左移是「算錯」，要問第幾步', C.isStructuralError(C.WRONG_FORMS.NO_SHIFT), false);
eq('被乘數乘數對調是「列式錯」，不可問第幾步', C.isStructuralError(C.WRONG_FORMS.SWAPPED_OPERANDS), true);
eq('6×28 對調成 28×6 積相同（所以不能靠答案判斷）', 6 * 28, 28 * 6);

/* =============================================================
 * 8. 防呆
 * =========================================================== */
group('8. 防呆');
function throws(fn) { try { fn(); return false; } catch (e) { return true; } }
eq('乘數超過一位數時 digitSteps 應拒絕', throws(function () { C.digitSteps(123, 12); }), true);
eq('負數應拒絕', throws(function () { C.digitsOf(-5); }), true);
eq('非整數應拒絕', throws(function () { C.digitsOf(1.5); }), true);
eq('超出位名範圍應拒絕', throws(function () { C.placeName(99); }), true);

/* ---------------------------------------------------------- */
console.log('\n' + '='.repeat(52));
console.log('  通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
console.log('='.repeat(52));
process.exit(fail === 0 ? 0 : 1);
