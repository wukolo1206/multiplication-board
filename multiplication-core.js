/* multiplication-core.js — 四上第二單元「整數的乘法」核心邏輯
 *
 * 網頁與測試共用同一份。不可把這裡的邏輯搬回 HTML 內嵌 —— 那會讓測試變成測複本。
 *
 * 設計依據：docs/superpowers/specs/2026-08-23-u2-multiplication-design.md v1.2
 * 教學用語一律留在 UI 層（見 FEEDBACK_TEXT），這裡只回傳代碼。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MulCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** 位名，索引 0 = 個位。課本用到的最大位是萬位。 */
  var PLACE_NAMES = ['個', '十', '百', '千', '萬', '十萬'];

  function placeName(i) {
    if (i < 0 || i >= PLACE_NAMES.length) throw new RangeError('超出位名範圍: ' + i);
    return PLACE_NAMES[i];
  }

  /** 把整數拆成各位數字，索引 0 = 個位。 */
  function digitsOf(n) {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('需要非負整數: ' + n);
    if (n === 0) return [0];
    var d = [];
    while (n > 0) { d.push(n % 10); n = Math.floor(n / 10); }
    return d;
  }

  /* ---------------------------------------------------------------
   * 一、逐位相乘（乘數為一位數）
   * ------------------------------------------------------------- */

  /**
   * 被乘數 × 一位數乘數，逐位展開。
   * 回傳陣列，索引 0 = 個位，每項為該位的完整計算狀態。
   */
  function digitSteps(multiplicand, multiplier) {
    if (multiplier < 0 || multiplier > 9) throw new RangeError('乘數需為一位數: ' + multiplier);
    var ds = digitsOf(multiplicand);
    var carryIn = 0;
    var steps = [];
    for (var i = 0; i < ds.length; i++) {
      var raw = ds[i] * multiplier;      // 未加進位的乘積
      var total = raw + carryIn;         // 加上進位後
      var write = total % 10;            // 這一位寫下的數字
      var carryOut = Math.floor(total / 10);
      steps.push({
        place: i, placeName: placeName(i),
        digit: ds[i], multiplier: multiplier,
        carryIn: carryIn, raw: raw, total: total,
        write: write, carryOut: carryOut
      });
      carryIn = carryOut;
    }
    if (carryIn > 0) {
      steps.push({
        place: ds.length, placeName: placeName(ds.length),
        digit: 0, multiplier: multiplier,
        carryIn: carryIn, raw: 0, total: carryIn,
        write: carryIn % 10, carryOut: Math.floor(carryIn / 10)
      });
    }
    return steps;
  }

  /* ---------------------------------------------------------------
   * 二、部分積（乘數為多位數）
   * ------------------------------------------------------------- */

  /**
   * 乘數逐位產生的部分積。
   * value    = 被乘數 × 該位數字（直式上「寫出來」的那串數字）
   * shifted  = 這一列真正代表的值（value × 10^place）
   * 例：28×74 -> [{digit:4, value:112, shift:0, shifted:112},
   *               {digit:7, value:196, shift:1, shifted:1960}]
   */
  function partialRows(multiplicand, multiplier) {
    var ms = digitsOf(multiplier);
    var rows = [];
    for (var i = 0; i < ms.length; i++) {
      var v = multiplicand * ms[i];
      rows.push({
        digit: ms[i], shift: i, placeName: placeName(i),
        value: v, shifted: v * Math.pow(10, i)
      });
    }
    return rows;
  }

  /** 完整結果與各層拆解，供各頁共用。 */
  function breakdown(multiplicand, multiplier) {
    var rows = partialRows(multiplicand, multiplier);
    return {
      multiplicand: multiplicand,
      multiplier: multiplier,
      product: multiplicand * multiplier,
      rows: rows,
      /** 兩列以上才需要把部分積相加（M11） */
      needsRowSum: rows.filter(function (r) { return r.digit !== 0; }).length > 1
    };
  }

  /**
   * 二位數乘數直式逐步拆解（每層一個一個數字呈現）。
   * phase 0: 第一行部分積（被乘數 × 個位乘數）逐位
   * phase 1: 第二行部分積（被乘數 × 十位乘數）逐位（向左移一位）
   * phase 2: 兩行相加（第一行 ＋ 第二行）逐位
   */
  function multiDigitSteps(multiplicand, multiplier) {
    if (!Number.isInteger(multiplicand) || multiplicand < 0) throw new RangeError('需要非負整數: ' + multiplicand);
    if (!Number.isInteger(multiplier) || multiplier < 10) throw new RangeError('multiDigitSteps 需要二位數乘數: ' + multiplier);
    var ms = digitsOf(multiplier); // [m0, m1]
    var m0 = ms[0], m1 = ms[1];
    var steps = [];

    function unitName(p) {
      return p === 0 ? '個一' : ('個' + placeName(p));
    }

    // Phase 0: Row 0 (multiplicand x m0)
    var s0 = digitSteps(multiplicand, m0);
    for (var i = 0; i < s0.length; i++) {
      var st = s0[i];
      var pName = placeName(st.place);
      var uName = unitName(st.place);
      var desc = '<b>第一行（重複個位數 ' + m0 + ' 次）</b>：';
      if (st.digit > 0 || st.raw > 0) {
        desc += st.digit + ' ' + uName + ' × ' + m0 + ' ＝ ' + st.raw + ' ' + uName;
        if (st.carryIn > 0) desc += '，加上進位 ' + st.carryIn + ' ' + uName + ' ＝ ' + st.total + ' ' + uName;
      } else if (st.carryIn > 0) {
        desc += '進位上來的 ' + st.carryIn + ' ' + uName;
      }
      desc += '，在第一行' + pName + '位寫 <b>' + st.write + '</b>' +
        (st.carryOut > 0 ? '（在' + placeName(st.place + 1) + '位上方記 ' + st.carryOut + '）' : '') + '。';
      steps.push({
        phase: 0,
        rowIndex: 0,
        stepInRow: i,
        place: st.place,
        colPlace: st.place,
        write: st.write,
        carryOut: st.carryOut,
        desc: desc
      });
    }

    // Phase 1: Row 1 (multiplicand x m1, shifted by 1)
    var s1 = digitSteps(multiplicand, m1);
    for (var i = 0; i < s1.length; i++) {
      var st = s1[i];
      var pActual = st.place + 1;
      var pNameActual = placeName(pActual);
      var uActual = unitName(pActual);
      var desc = '<b>第二行（重複次數是十次：' + (m1 * 10) + ' 次）</b>：';
      if (st.digit > 0 || st.raw > 0) {
        desc += st.digit + ' × ' + m1 + ' 個十 ＝ ' + st.raw + ' ' + uActual;
        if (st.carryIn > 0) desc += '，加上進位 ' + st.carryIn + ' ' + uActual + ' ＝ ' + st.total + ' ' + uActual;
      } else if (st.carryIn > 0) {
        desc += '進位上來的 ' + st.carryIn + ' ' + uActual;
      }
      desc += '，在第二行' + pNameActual + '位寫 <b>' + st.write + '</b>（對齊' + pNameActual + '位' +
        (st.place === 0 ? '，往左移一位' : '') + '）' +
        (st.carryOut > 0 ? '（進位 ' + st.carryOut + '）' : '') + '。';
      steps.push({
        phase: 1,
        rowIndex: 1,
        stepInRow: i,
        place: st.place,
        colPlace: pActual,
        write: st.write,
        carryOut: st.carryOut,
        desc: desc
      });
    }

    // Phase 2: Row 2 (Sum: row 0 + row 1 shifted)
    var r0Val = multiplicand * m0;
    var r1ValShifted = multiplicand * m1 * 10;
    var prod = multiplicand * multiplier;
    var ds0 = digitsOf(r0Val);
    var ds1 = digitsOf(r1ValShifted);
    var dsProd = digitsOf(prod);
    var numCols = dsProd.length;

    var carry = 0;
    for (var p = 0; p < numCols; p++) {
      var d0 = ds0[p] || 0;
      var d1 = ds1[p] || 0;
      var tot = d0 + d1 + carry;
      var w = tot % 10;
      var nextCarry = Math.floor(tot / 10);
      var pName = placeName(p);
      var desc = '<b>兩行相加（' + pName + '位）</b>：' +
        (p === 0 ? (d0 + ' ＋ 0 ＝ <b>' + w + '</b>') : (d0 + ' ＋ ' + d1 + (carry > 0 ? ' ＋ 進位 ' + carry : '') + ' ＝ ' + tot)) +
        '，在' + pName + '位寫 <b>' + w + '</b>' +
        (nextCarry > 0 ? '（進位 ' + nextCarry + '）' : '') + '。';
      steps.push({
        phase: 2,
        rowIndex: 2,
        stepInRow: p,
        place: p,
        colPlace: p,
        write: w,
        carryOut: nextCarry,
        desc: desc
      });
      carry = nextCarry;
    }

    return steps;
  }

  /* ---------------------------------------------------------------
   * 三、面積模型（array.html，二位數×二位數）
   * ------------------------------------------------------------- */

  /**
   * 課本 p24 的行列圖形四區塊。
   * 24×12 -> ①4×2=8 ②20×2=40 ③4×10=40 ④20×10=200
   * 回傳的 label 對應課本標號 ①②③④。
   */
  function areaBlocks(a, b) {
    var aTens = Math.floor(a / 10) * 10, aOnes = a % 10;
    var bTens = Math.floor(b / 10) * 10, bOnes = b % 10;
    var mk = function (label, x, y, rowIndex) {
      return { label: label, x: x, y: y, area: x * y, rowIndex: rowIndex };
    };
    return [
      mk('①', aOnes, bOnes, 0),
      mk('②', aTens, bOnes, 0),
      mk('③', aOnes, bTens, 1),
      mk('④', aTens, bTens, 1)
    ];
  }

  /**
   * 四區塊 → 兩列標準部分積的歸併。
   * rowIndex 0 的兩塊合成第一列（48），rowIndex 1 的兩塊合成第二列（240）。
   * 這是 array.html 階段二「主動合併」要驗證的對應關係。
   */
  function blocksToRows(a, b) {
    var blocks = areaBlocks(a, b);
    return [0, 1].map(function (ri) {
      var mine = blocks.filter(function (bl) { return bl.rowIndex === ri; });
      return {
        rowIndex: ri,
        blocks: mine.map(function (bl) { return bl.label; }),
        sum: mine.reduce(function (s, bl) { return s + bl.area; }, 0)
      };
    });
  }

  /* ---------------------------------------------------------------
   * 四、逐位診斷（carry.html）
   * ------------------------------------------------------------- */

  /**
   * 判定學生在某一位填入的「寫入格 + 進位格」。
   *
   * 兩格一起判定是能消歧義的關鍵：只看寫入格時，
   * 「漏進位」與「先加後乘」有 80 組碰撞（條件為 (carryIn*multiplier)%10===0）。
   *
   * 被乘數該位為 0 時，(0+carryIn)*multiplier 與 carryIn*multiplier 是同一個算式，
   * 「拿進位去乘」與「先加後乘」在數學上無從分辨 —— 因此不設兩個代碼，
   * 合併為 ZERO_DIGIT_CARRY_CONFUSION，由 UI 給一句兩種讀法都成立的回饋。
   */
  function diagnoseDigit(o) {
    var inWrite = o.inWrite, inCarry = o.inCarry;
    var digit = o.digit, multiplier = o.multiplier, carryIn = o.carryIn;

    var raw = digit * multiplier;
    var total = raw + carryIn;
    if (inWrite === total % 10 && inCarry === Math.floor(total / 10)) {
      return { code: 'CORRECT' };
    }

    // 進位相關的診斷只在真的有進位時才做，否則答對會被誤判成漏進位
    if (carryIn > 0) {
      var cands = [];
      if (inWrite === raw % 10 && inCarry === Math.floor(raw / 10)) {
        cands.push('OMIT_CARRY');            // ★ 教冊明文 C-MUL-CARRY-OMIT
      }
      var ab = (digit + carryIn) * multiplier;
      if (inWrite === ab % 10 && inCarry === Math.floor(ab / 10)) {
        cands.push(digit === 0 ? 'ZERO_DIGIT_CARRY_CONFUSION' : 'ADD_BEFORE_MUL');
      }
      if (cands.length === 1) return { code: cands[0] };
      // 守門分支：窮舉全輸入空間後出現 0 次。若觸發代表規格被改過，要回頭重驗。
      if (cands.length > 1) return { code: 'AMBIGUOUS_CARRY', cands: cands };
    }
    return { code: 'FACT_ERROR' };
  }

  /* ---------------------------------------------------------------
   * 五、列層級診斷（carry.html 二位數以上）
   * ------------------------------------------------------------- */

  /**
   * 學生在整列格填入該列部分積。
   * 只從一個數值無法判斷細部錯因，因此「答錯就展開該列」降到逐位再診斷。
   *
   * expectShift 是該列應有的左移位數；inShift 是學生實際放置的位置。
   */
  function diagnoseRow(o) {
    var row = o.row;                       // partialRows() 的其中一項
    var inValue = o.inValue, inShift = o.inShift;

    if (inValue === row.value && inShift === row.shift) return { code: 'CORRECT' };
    if (inValue === row.value && inShift !== row.shift) {
      // 算對了但位置放錯 —— ★ 教冊明文 C-MUL-PARTIAL-ALIGN
      return { code: 'NO_SHIFT', expected: row.shift, got: inShift };
    }
    // 其他錯誤：展開該列逐位重問
    return { code: 'EXPAND_ROW', digit: row.digit };
  }

  /** 兩列都乘對、最後相加錯（M11）。 */
  function diagnoseRowSum(o) {
    var rows = o.rows, inSum = o.inSum;
    var correct = rows.reduce(function (s, r) { return s + r.shifted; }, 0);
    if (inSum === correct) return { code: 'CORRECT' };
    return { code: 'SUM_ERROR', expected: correct };
  }

  /* ---------------------------------------------------------------
   * 六、錯誤直式的分類（fix.html）
   * ------------------------------------------------------------- */

  /**
   * 課本 p29 練習百分百(二)第2題印出的錯誤直式類型。
   *
   * DIGITWISE_PAIRING —— 同位對應相乘：個位×個位、十位×十位，只寫一列。
   *   已核對課本原圖：21×43 寫成 83（1×3=3、2×4=8）。
   *   這是課本安排學生辨識的錯誤型，units.json 記為 manual_inferred。
   * NO_SHIFT —— 第二列部分積未左移：37×52 寫成 74/185/259。
   * SWAPPED_OPERANDS —— 把「一位數×二位數」寫成「二位數×一位數」。
   *   ★ 教冊明文 C-MUL-SWAP-OPERANDS。注意：這一型每一步計算都是對的，
   *   錯在列式結構，fix.html 不可問學生「第幾步算錯」。
   */
  var WRONG_FORMS = {
    DIGITWISE_PAIRING: 'DIGITWISE_PAIRING',
    NO_SHIFT: 'NO_SHIFT',
    OMIT_CARRY: 'OMIT_CARRY',
    SWAPPED_OPERANDS: 'SWAPPED_OPERANDS'
  };

  /** 依「同位對應相乘」產生錯誤值，供 fix.html 出題與測試比對。 */
  function digitwisePairingValue(a, b) {
    var as = digitsOf(a), bs = digitsOf(b);
    var n = Math.max(as.length, bs.length), v = 0;
    for (var i = 0; i < n; i++) {
      var x = (as[i] || 0) * (bs[i] || 0);
      v += x * Math.pow(10, i);
    }
    return v;
  }

  /** 依「第二列未左移」產生錯誤值。 */
  function noShiftValue(a, b) {
    return partialRows(a, b).reduce(function (s, r) { return s + r.value; }, 0);
  }

  /** 這一型錯誤是「算錯」還是「列式錯」—— 決定 fix.html 的問法。 */
  function isStructuralError(form) {
    return form === WRONG_FORMS.SWAPPED_OPERANDS;
  }

  /**
   * 生成「一位數 × 整十」題目物件。
   * @param {number} [idx] 固定題號（0~4 依序為經典題，>=5 隨機題）
   */
  function generateSingleByTens(idx) {
    var fixed = [
      { a: 8, b: 10 },
      { a: 8, b: 20 },
      { a: 8, b: 30 },
      { a: 6, b: 40 },
      { a: 7, b: 50 }
    ];
    var a, b;
    if (typeof idx === 'number' && idx >= 0 && idx < fixed.length) {
      a = fixed[idx].a;
      b = fixed[idx].b;
    } else {
      a = Math.floor(Math.random() * 8) + 2; // 2 ~ 9
      var bCore = Math.floor(Math.random() * 8) + 2; // 2 ~ 9
      b = bCore * 10;
    }
    var bCoreActual = Math.floor(b / 10);
    var baseProd = a * bCoreActual;
    var ans = a * b;
    return {
      type: 'single_by_tens',
      a: a,
      b: b,
      bCore: bCoreActual,
      ans: ans,
      baseFact: { a: a, b: bCoreActual, prod: baseProd },
      zeros: 1,
      hint: a + '×' + bCoreActual + '＝' + baseProd + '，' + a + ' 的 ' + b + ' 倍是 ' + baseProd + ' 個十，也就是 ' + ans + '。'
    };
  }

  /**
   * 生成「整十 × 整十」題目物件。
   * @param {number} [idx] 固定題號（0~4 依序為經典題，>=5 隨機題）
   */
  function generateTensByTens(idx) {
    var fixed = [
      { a: 40, b: 10 },
      { a: 40, b: 20 },
      { a: 40, b: 30 },
      { a: 30, b: 50 },
      { a: 60, b: 80 }
    ];
    var a, b;
    if (typeof idx === 'number' && idx >= 0 && idx < fixed.length) {
      a = fixed[idx].a;
      b = fixed[idx].b;
    } else {
      var aCore = Math.floor(Math.random() * 8) + 2; // 2 ~ 9
      var bCore = Math.floor(Math.random() * 8) + 2; // 2 ~ 9
      a = aCore * 10;
      b = bCore * 10;
    }
    var aCoreActual = Math.floor(a / 10);
    var bCoreActual = Math.floor(b / 10);
    var baseProd = aCoreActual * bCoreActual;
    var ans = a * b;
    return {
      type: 'tens_by_tens',
      a: a,
      b: b,
      aCore: aCoreActual,
      bCore: bCoreActual,
      ans: ans,
      baseFact: { a: aCoreActual, b: bCoreActual, prod: baseProd },
      zeros: 2,
      hint: aCoreActual + '×' + bCoreActual + '＝' + baseProd + '，' + a + '×' + b + ' 是 ' + baseProd + ' 個百，也就是 ' + ans + '。'
    };
  }

  /**
   * 診斷橫式作答：一位數×整十 或 整十×整十。
   */
  function diagnoseHorizontal(a, b, inputVal) {
    var val = Number(inputVal);
    if (isNaN(val)) return { code: 'INVALID_INPUT' };
    var correct = a * b;
    if (val === correct) return { code: 'CORRECT', correct: correct };

    var isTensByTens = (a % 10 === 0 && b % 10 === 0 && a >= 10 && b >= 10);
    if (isTensByTens) {
      var aCore = Math.floor(a / 10);
      var bCore = Math.floor(b / 10);
      var baseProd = aCore * bCore;

      if (val === baseProd) {
        return { code: 'ZERO_TOO_FEW', expectedZeros: 2, actualZeros: 0, baseProd: baseProd };
      }
      if (val === baseProd * 10) {
        return { code: 'ZERO_TOO_FEW', expectedZeros: 2, actualZeros: 1, baseProd: baseProd };
      }
      if (val === baseProd * 1000) {
        return { code: 'ZERO_TOO_MANY', expectedZeros: 2, actualZeros: 3, baseProd: baseProd };
      }
      if (val % 100 === 0 && Math.floor(val / 100) !== baseProd) {
        return { code: 'BASE_FACT_ERROR', baseFactInput: Math.floor(val / 100), expectedBaseFact: baseProd };
      }
      return { code: 'CALC_ERROR', correct: correct };
    } else {
      var bCoreSingle = Math.floor(b / 10);
      var baseProdSingle = a * bCoreSingle;

      if (val === baseProdSingle) {
        return { code: 'ZERO_TOO_FEW', expectedZeros: 1, actualZeros: 0, baseProd: baseProdSingle };
      }
      if (val === baseProdSingle * 100) {
        return { code: 'ZERO_TOO_MANY', expectedZeros: 1, actualZeros: 2, baseProd: baseProdSingle };
      }
      if (val % 10 === 0 && Math.floor(val / 10) !== baseProdSingle) {
        return { code: 'BASE_FACT_ERROR', baseFactInput: Math.floor(val / 10), expectedBaseFact: baseProdSingle };
      }
      return { code: 'CALC_ERROR', correct: correct };
    }
  }

  return {
    PLACE_NAMES: PLACE_NAMES,
    WRONG_FORMS: WRONG_FORMS,
    placeName: placeName,
    digitsOf: digitsOf,
    digitSteps: digitSteps,
    multiDigitSteps: multiDigitSteps,
    partialRows: partialRows,
    breakdown: breakdown,
    areaBlocks: areaBlocks,
    blocksToRows: blocksToRows,
    diagnoseDigit: diagnoseDigit,
    diagnoseRow: diagnoseRow,
    diagnoseRowSum: diagnoseRowSum,
    digitwisePairingValue: digitwisePairingValue,
    noShiftValue: noShiftValue,
    isStructuralError: isStructuralError,
    generateSingleByTens: generateSingleByTens,
    generateTensByTens: generateTensByTens,
    diagnoseHorizontal: diagnoseHorizontal
  };
});
