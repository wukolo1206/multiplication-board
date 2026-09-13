# Array 無限乘法直式練習 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 array.html 的固定練習改成可選被乘數位數、放大直式、顯示位值口語提示並可無限出題的乘法部分積練習。

**Architecture:** 在 multiplication-core.js 新增純函式，統一產生題目與計算個位列、十位列、完整積及重複次數；array.html 只負責題目控制、直式排版、輸入驗證、口語文字與回饋。既有探索與挑戰分頁保持原樣，端到端測試改測新的練習流程。

**Tech Stack:** 純 HTML、CSS、原生 JavaScript、Node.js 核心測試、Python Playwright 端到端測試；沿用 python run-tests.py 作為單一驗證入口。

---

## 檔案與責任對照

- Modify: multiplication-core.test.js — 新增核心題目資料的失敗測試。
- Modify: multiplication-core.js — 新增 arrayPracticeParts(a, b) 與 generateArrayPracticeQuestion(digits)。
- Modify: e2e.spec.py — 將 array.html 固定四關驗收改成新練習流程。
- Modify: array.html — 加入位數選單、放大直式輸入區、口語提示與無限練習狀態。
- Modify: DECISIONS.md、CHANGELOG.md、CLAUDE.md、handoff.md — 功能驗證後記錄決策、版本、交接與 frontmatter。
- Modify: ../專案總表.md — 同步 multiplication-board 的功能描述；不要把上層其他既有變更一起提交。

## 核心介面約定

arrayPracticeParts(a, b) 回傳：

    {
      a: a,
      b: b,
      onesDigit: b % 10,
      tensDigit: Math.floor(b / 10),
      onesRepeats: b % 10,
      tensRepeats: Math.floor(b / 10) * 10,
      firstRow: a * (b % 10),
      secondRow: a * Math.floor(b / 10) * 10,
      product: a * b,
      repeatTotal: b
    }

generateArrayPracticeQuestion(digits) 依 digits 產生 1、2、3 或 4 位數的被乘數；乘數為十位與個位皆為 1–9 的兩位數，並回傳相同格式的物件。第二列主要算式必須使用 secondRow 的實際位值，例如 24×10＝240，不顯示容易混淆的 24×1。

### Task 1: 先加入核心邏輯的失敗測試

**Files:**
- Backup: multiplication-core.test.js.bak
- Modify: multiplication-core.test.js

- [ ] Step 1: 備份目前測試檔。

    Copy-Item -LiteralPath 'multiplication-core.test.js' -Destination 'multiplication-core.test.js.bak' -Force

- [ ] Step 2: 在既有測試的最終 pass/fail 區塊前加入下列測試，不先新增 production code。

    group('7. array 無限練習題資料');
    var p24 = C.arrayPracticeParts(24, 12);
    eq('24×12 個位列資料',
      [p24.onesDigit, p24.onesRepeats, p24.firstRow], [2, 2, 48]);
    eq('24×12 十位列使用×10',
      [p24.tensDigit, p24.tensRepeats, p24.secondRow], [1, 10, 240]);
    eq('24×12 完整積與重複次數',
      [p24.product, p24.repeatTotal], [288, 12]);

    var p375 = C.arrayPracticeParts(375, 46);
    eq('375×46 兩列部分積',
      [p375.firstRow, p375.secondRow, p375.product, p375.repeatTotal],
      [2250, 15000, 17250, 46]);

    [1, 2, 3, 4].forEach(function (digits) {
      var q = C.generateArrayPracticeQuestion(digits);
      var min = digits === 1 ? 1 : Math.pow(10, digits - 1);
      var max = Math.pow(10, digits) - 1;
      eq(digits + '位被乘數範圍',
        [q.a >= min && q.a <= max, String(q.a).length], [true, digits]);
      eq(digits + '位題目的資料一致',
        [q.b >= 11 && q.b <= 99, q.b % 10 > 0,
          Math.floor(q.b / 10) > 0, q.secondRow,
          q.a * q.b, q.repeatTotal],
        [true, true, true, q.a * Math.floor(q.b / 10) * 10,
          q.a * q.b, q.b]);
    });

- [ ] Step 3: 執行 node multiplication-core.test.js。

Expected: 既有測試通過，新增群組因 C.arrayPracticeParts 尚不存在而以 TypeError 失敗。確認是功能缺少，而不是測試語法錯誤。

### Task 2: 以最小實作讓核心測試變綠

**Files:**
- Backup: multiplication-core.js.bak
- Modify: multiplication-core.js
- Test: multiplication-core.test.js

- [ ] Step 1: 備份目前核心檔。

    Copy-Item -LiteralPath 'multiplication-core.js' -Destination 'multiplication-core.js.bak' -Force

- [ ] Step 2: 在 blocksToRows 函式後加入下列純函式。

    function arrayPracticeParts(a, b) {
      var onesDigit = b % 10;
      var tensDigit = Math.floor(b / 10);
      var tensRepeats = tensDigit * 10;
      return {
        a: a,
        b: b,
        onesDigit: onesDigit,
        tensDigit: tensDigit,
        onesRepeats: onesDigit,
        tensRepeats: tensRepeats,
        firstRow: a * onesDigit,
        secondRow: a * tensRepeats,
        product: a * b,
        repeatTotal: onesDigit + tensRepeats
      };
    }

- [ ] Step 3: 緊接著加入產生器。使用合法位數範圍及非零乘數兩位數。

    function generateArrayPracticeQuestion(digits) {
      var min = digits === 1 ? 1 : Math.pow(10, digits - 1);
      var max = Math.pow(10, digits) - 1;
      var a = Math.floor(Math.random() * (max - min + 1)) + min;
      var tensDigit = Math.floor(Math.random() * 9) + 1;
      var onesDigit = Math.floor(Math.random() * 9) + 1;
      var b = tensDigit * 10 + onesDigit;
      return arrayPracticeParts(a, b);
    }

- [ ] Step 4: 在 MulCore 回傳物件中、areaBlocks 與 blocksToRows 附近輸出兩個函式。

    arrayPracticeParts: arrayPracticeParts,
    generateArrayPracticeQuestion: generateArrayPracticeQuestion,

- [ ] Step 5: 執行 node multiplication-core.test.js。

Expected: 原有測試及 Task 1 新增測試全部 PASS，失敗數為 0。

- [ ] Step 6: 提交核心變更。

    git add multiplication-core.js multiplication-core.test.js
    git commit -m "feat: add array practice question core"

備份檔必須留在原始檔旁；若 .gitignore 不追蹤 .bak，不要為了提交而改動忽略規則。

### Task 3: 先加入瀏覽器端失敗測試

**Files:**
- Backup: e2e.spec.py.bak
- Modify: e2e.spec.py

- [ ] Step 1: 備份端到端測試。

    Copy-Item -LiteralPath 'e2e.spec.py' -Destination 'e2e.spec.py.bak' -Force

- [ ] Step 2: 保留 array.html 前面的探索流程測試，將原本固定 L1/L2/L3 的區塊替換成以下驗收。

    pg.click('#tabQz'); pg.wait_for_timeout(120)
    ck('無限練習' in pg.eval_on_selector('#lvTag', 'e=>e.textContent'),
       '練習頁標示無限練習')
    ck(pg.eval_on_selector_all('#digitsSelect option',
       'e=>e.map(x=>x.value)'), ['1', '2', '3', '4'],
       '被乘數位數有一至四位可選')

    for digits in [1, 2, 3, 4]:
        pg.select_option('#digitsSelect', str(digits))
        pg.wait_for_timeout(80)
        q = pg.evaluate('practiceState.question')
        ck(len(str(q['a'])) == digits,
           '%d位選擇產生%d位被乘數' % (digits, digits))
        speech = pg.eval_on_selector(
            '#qSpeech', 'e=>e.textContent').replace(' ', '')
        ck(('重複%d次' % q['tensRepeats']) in speech,
           '%d位題目說明十位重複次數' % digits)
        ck(('×%d' % q['tensRepeats']) in speech,
           '%d位題目第二列使用實際十位值' % digits)
        ck(pg.eval_on_selector('#practiceVertical .second-row',
           'e=>e.dataset.shift') == '1',
           '%d位題目第二列標記左移一位' % digits)

    q = pg.evaluate('practiceState.question')
    pg.fill('#firstRowIn', str(q['firstRow']))
    pg.fill('#secondRowIn', str(q['firstRow']))
    pg.fill('#totalIn', str(q['product']))
    pg.click('#qBtn'); pg.wait_for_timeout(120)
    ck('十位' in msg(pg, '#qMsg') and '10' in msg(pg, '#qMsg'),
       '第二列錯誤會提示十位代表10倍')

    pg.fill('#secondRowIn', str(q['secondRow']))
    pg.click('#qBtn'); pg.wait_for_timeout(120)
    ck('答對' in msg(pg, '#qMsg'), '三個答案都正確時通過')
    ck(pg.eval_on_selector('#qNext', 'e=>e.style.display') != 'none',
       '答對後出現下一題')
    pg.click('#qNext'); pg.wait_for_timeout(100)
    ck('已練習 1 題' in pg.eval_on_selector(
       '#lvTag', 'e=>e.textContent'), '下一題可繼續且累計已練習題數')

- [ ] Step 3: 執行 python run-tests.py。

Expected: 核心測試通過；array.html 端到端測試在 #digitsSelect 等新 selector 尚不存在處失敗。這是預期的 RED 狀態。

### Task 4: 先完成新練習的 HTML 與 CSS 骨架

**Files:**
- Backup: array.html.bak
- Modify: array.html

- [ ] Step 1: 第一次修改 array.html 前備份目前檔案。

    Copy-Item -LiteralPath 'array.html' -Destination 'array.html.bak' -Force

- [ ] Step 2: 在 pQz 卡片中保留 qText、qBody、qMsg、qBtn、qNext 的 id，並將固定關卡標籤換成：

    <div class="practice-head">
      <span class="lv" id="lvTag">無限練習／已練習 0 題</span>
      <label class="digit-select" for="digitsSelect">
        被乘數位數
        <select id="digitsSelect">
          <option value="1">一位數</option>
          <option value="2" selected>兩位數</option>
          <option value="3">三位數</option>
          <option value="4">四位數</option>
        </select>
      </label>
    </div>
    <p class="q" id="qText"></p>
    <div class="speech" id="qSpeech" aria-live="polite"></div>
    <div id="qBody"></div>
    <div class="msg" id="qMsg"></div>
    <div class="row">
      <button class="btn" id="qBtn" onclick="submitQ()">檢查答案</button>
      <button class="btn ghost" id="qNext" style="display:none"
              onclick="nextQ()">下一題 →</button>
    </div>

移除舊的 qWarn，因為無限練習沒有最後一關提醒。

- [ ] Step 3: 在 stylesheet 加入以下必要 class；第二列的 data-shift=\"1\" 是驗收用的位值標記。

    .practice-head{display:flex;gap:14px;align-items:center;
                   justify-content:space-between;flex-wrap:wrap}
    .digit-select{display:flex;align-items:center;gap:8px;font-size:17px;
                  font-weight:700;color:#334155}
    .digit-select select{min-height:48px;padding:0 12px;border:2px solid #cbd5e1;
                         border-radius:12px;font-size:17px;font-family:inherit;
                         background:#fff;color:#1f2937}
    .speech{margin:10px 0 14px;padding:13px 16px;border-left:5px solid #0ea5e9;
            background:#f0f9ff;color:#075985;font-size:19px;line-height:1.8;
            font-weight:700}
    .practice-layout{display:flex;flex-direction:column;gap:14px;align-items:flex-start}
    .practice-vertical{display:inline-flex;flex-direction:column;align-items:flex-end;
                       gap:3px;padding:16px 20px;background:#fff7ed;
                       border:3px solid #fed7aa;border-radius:16px;
                       font-family:"Courier New",monospace;
                       font-size:clamp(34px,6vw,58px);line-height:1.2;
                       font-variant-numeric:tabular-nums;max-width:100%;overflow-x:auto}
    .practice-number{min-width:5.4em;text-align:right;white-space:nowrap}
    .practice-number.multiplier:before{content:'×';margin-right:.15em}
    .practice-line{width:100%;border-top:4px solid #1f2937;margin:4px 0}
    .practice-row{display:flex;align-items:center;justify-content:flex-end;
                  min-width:100%}
    .practice-row.second-row{padding-right:1.05em}
    .practice-row .row-label{font-family:"Microsoft JhengHei","PingFang TC",sans-serif;
                             font-size:clamp(16px,2.5vw,21px);font-weight:700;
                             color:#92400e;margin-right:14px;white-space:nowrap}
    .practice-row .row-input{width:clamp(130px,25vw,210px);min-height:58px;
                             font-size:clamp(28px,5vw,44px);text-align:right;
                             border:3px solid #cbd5e1;border-radius:12px;
                             font-family:"Courier New",monospace;padding:0 10px}
    .practice-row .row-input:focus{outline:none;border-color:#7c3aed;
                                    box-shadow:0 0 0 3px #ede9fe}
    .practice-answer{display:flex;gap:10px;align-items:center;flex-wrap:wrap;
                     margin-top:14px;font-size:clamp(18px,3vw,24px);font-weight:700}
    .repeat-total{padding:11px 14px;background:#fef3c7;border:2px solid #fcd34d;
                  border-radius:12px;font-size:clamp(18px,3vw,24px);
                  line-height:1.6;font-weight:700;color:#92400e}
    @media(max-width:640px){.card{padding:12px}.speech{font-size:17px}
      .practice-row{justify-content:flex-start}.practice-row.second-row{padding-right:0}
      .practice-row .row-label{font-size:16px;margin-right:8px}
      .practice-row .row-input{width:145px}}

- [ ] Step 4: 執行 python run-tests.py，確認 selector 與靜態 DOM 檢查可繼續往下，核心測試仍為綠燈；若在 state 或 render 行為處失敗，進入 Task 5。

### Task 5: 以最小 JavaScript 取代固定關卡

**Files:**
- Modify: array.html — 替換舊 QS、qi、renderQ、submitQ、nextQ 區塊。
- Test: multiplication-core.test.js、e2e.spec.py

- [ ] Step 1: 建立全域 practiceState 與口語格式化函式。

    var practiceState = {
      digits: 2,
      completed: 0,
      question: null,
      locked: false
    };

    function practiceSpeech(q) {
      return [
        '先看個位，第一排。個位是 ' + q.onesDigit + '，被乘數重複 ' +
          q.onesRepeats + ' 次；' + q.a + '×' + q.onesRepeats + '＝第一列。',
        '再看十位，左移一位。十位是 ' + q.tensDigit +
          '，也就是 1 個十，也就是重複 ' + q.tensRepeats +
          ' 次；' + q.a + '×' + q.tensRepeats +
          '＝第二列，答案要對齊十位。',
        '兩排相加，答案出現。最後確認：' + q.onesRepeats + '＋' +
          q.tensRepeats + '＝' + q.repeatTotal + ' 次。'
      ].join('<br>');
    }

第二列主算式只能串接 q.tensRepeats；不得串接 q.tensDigit，以免把 24×1 當成主要提示。

- [ ] Step 2: 建立 newPracticeQuestion 與 renderPracticeQuestion。render 時產生以下固定 selector：

    function newPracticeQuestion() {
      practiceState.question =
        C.generateArrayPracticeQuestion(practiceState.digits);
      practiceState.locked = false;
      renderPracticeQuestion();
    }

    function renderPracticeQuestion() {
      var q = practiceState.question;
      document.getElementById('lvTag').textContent =
        '無限練習／已練習 ' + practiceState.completed + ' 題';
      document.getElementById('qText').innerHTML =
        '請完成 <b>' + q.a + ' × ' + q.b + '</b> 的兩列直式。';
      document.getElementById('qSpeech').innerHTML = practiceSpeech(q);
      document.getElementById('qMsg').className = 'msg';
      document.getElementById('qBtn').style.display = '';
      document.getElementById('qNext').style.display = 'none';
      document.getElementById('qBody').innerHTML =
        '<div class="practice-layout">' +
          '<div class="practice-vertical" id="practiceVertical">' +
            '<div class="practice-number">' + q.a + '</div>' +
            '<div class="practice-number multiplier">' + q.b + '</div>' +
            '<div class="practice-line"></div>' +
            '<div class="practice-row first-row" data-shift="0">' +
              '<span class="row-label">第一列（×' + q.onesRepeats + '）</span>' +
              '<input class="row-input" id="firstRowIn" type="number" ' +
                'inputmode="numeric" aria-label="第一列部分積">' +
            '</div>' +
            '<div class="practice-row second-row" data-shift="1">' +
              '<span class="row-label">第二列（×' + q.tensRepeats +
                '，對齊十位）</span>' +
              '<input class="row-input" id="secondRowIn" type="number" ' +
                'inputmode="numeric" aria-label="第二列部分積">' +
            '</div>' +
            '<div class="practice-line"></div>' +
            '<div class="practice-answer">' +
              '<span>兩列相加＝</span>' +
              '<input class="row-input" id="totalIn" type="number" ' +
                'inputmode="numeric" aria-label="最後答案">' +
            '</div>' +
          '</div>' +
          '<div class="repeat-total">重複次數：' + q.onesRepeats +
            ' 次 ＋ ' + q.tensRepeats + ' 次 ＝ ' + q.repeatTotal +
            ' 次</div>' +
        '</div>';
    }

- [ ] Step 3: 建立空值檢查、分步回饋與無限下一題流程。

    function submitQ() {
      if (practiceState.locked) return;
      var q = practiceState.question;
      var firstEl = document.getElementById('firstRowIn');
      var secondEl = document.getElementById('secondRowIn');
      var totalEl = document.getElementById('totalIn');
      var m = document.getElementById('qMsg');
      if (!firstEl.value || !secondEl.value || !totalEl.value) {
        m.className = 'msg no show';
        m.textContent = '三個答案都填好，再按檢查答案。';
        return;
      }
      if (Number(firstEl.value) !== q.firstRow) {
        m.className = 'msg no show';
        m.innerHTML = '先看個位，個位是 ' + q.onesDigit +
          '，請計算被乘數重複 ' + q.onesRepeats + ' 次。';
        return;
      }
      if (Number(secondEl.value) !== q.secondRow) {
        m.className = 'msg no show';
        m.innerHTML = '十位的數字 ' + q.tensDigit + ' 是 ' +
          q.tensDigit + ' 個十，也就是重複 ' + q.tensRepeats +
          ' 次；請計算被乘數×' + q.tensRepeats +
          '，並對齊十位。';
        return;
      }
      if (Number(totalEl.value) !== q.product) {
        m.className = 'msg no show';
        m.innerHTML = '兩列部分積都對了，請再把第一列和第二列相加。';
        return;
      }
      practiceState.locked = true;
      practiceState.completed += 1;
      m.className = 'msg ok show';
      m.innerHTML = '答對了。<br>' + q.a + '×' + q.onesRepeats +
        '＝' + q.firstRow + '；' + q.a + '×' + q.tensRepeats +
        '＝' + q.secondRow + '；' + q.firstRow + '＋' +
        q.secondRow + '＝<b>' + q.product + '</b>。<br>' +
        q.onesRepeats + '＋' + q.tensRepeats + '＝' +
        q.repeatTotal + ' 次。';
      document.getElementById('qBtn').style.display = 'none';
      document.getElementById('qNext').style.display = '';
    }

    function nextQ() {
      newPracticeQuestion();
    }

    document.getElementById('digitsSelect').addEventListener(
      'change', function () {
        practiceState.digits = Number(this.value);
        newPracticeQuestion();
      });
    newPracticeQuestion();

- [ ] Step 4: 執行 python run-tests.py。

Expected: 核心測試、原有探索與挑戰測試、新增無限練習測試全部通過；無 pageerror 或 console error。

- [ ] Step 5: 提交頁面行為。

    git add array.html e2e.spec.py
    git commit -m "feat: make array practice unlimited with oral prompts"

### Task 6: 補窄版驗收並確認大字排版

**Files:**
- Modify: e2e.spec.py — 在 array.html 桌面測試後加入窄版檢查。
- Test: python run-tests.py

- [ ] Step 1: 備份若尚未存在的 e2e.spec.py，再加入：

    pg.set_viewport_size({'width': 390, 'height': 844})
    pg.reload(); pg.wait_for_load_state('networkidle')
    pg.click('#tabQz'); pg.wait_for_timeout(100)
    ck(pg.eval_on_selector('#qSpeech',
       'e=>e.getBoundingClientRect().width') <= 360,
       '窄版口語提示不超出視窗')
    ck(pg.eval_on_selector('#practiceVertical',
       'e=>e.getBoundingClientRect().right <= window.innerWidth'),
       '窄版放大直式不超出視窗')
    pg.set_viewport_size({'width': 1100, 'height': 900})

- [ ] Step 2: 執行 python run-tests.py；預期所有核心與端到端測試通過，且沒有 pageerror 或 console error。

- [ ] Step 3: 若驗收失敗，先用失敗 assertion 固定問題，再只修改 array.html 的對應 CSS 或 JS；不得改變 ×10 文案、data-shift=\"1\" 或探索／挑戰測試契約。

### Task 7: 更新專案紀錄

**Files:**
- Modify: DECISIONS.md、CHANGELOG.md、CLAUDE.md、handoff.md
- Modify: ../專案總表.md

- [ ] Step 1: 在 DECISIONS.md 底部加入：

    ## 無限練習第一版先固定兩位數乘數

    **選擇：** 被乘數可選一至四位數；乘數固定兩位數，且個位與十位皆非 0；第二列主要算式顯示被乘數乘以實際十位值，例如 24×10，不顯示 24×1。
    **原因：** 本功能的核心是讓學生反覆說出個位第一排、十位是幾個十、第二排對齊十位、重複次數加總等於乘數。先排除 0 的特殊情況，能讓口語骨架穩定並把注意力留在位值與部分積。
    **棄選方案：** 第一版直接納入十位或個位為 0 的題目；這會增加省略部分積與只剩一列的例外，先保留到後續難度設定。
    **生效版本：** v1.1／2026-09-13

- [ ] Step 2: 在 CHANGELOG.md 頂端加入：

    ## @v1.1 — array.html 無限乘法直式練習
    - 被乘數可選一至四位數，預設兩位數。
    - 練習改為無限出題，第二列以 ×10 等實際十位值呈現並對齊十位。
    - 新增固定口訣與每題動態位值口語提示，並放大直式與輸入區。

- [ ] Step 3: 只修改 CLAUDE.md frontmatter 的四欄：

    status: 維護中
    version: "v1.1 array.html 無限乘法直式練習"
    next_action: 到學校用平板驗收 array.html 無限練習、十位對齊與口語提示
    updated: 2026-09-13

- [ ] Step 4: 在 handoff.md 頂端加入 2026-09-13 交接，必須包含目前狀態、本次驗證、下次接續、注意事項；內容至少寫明已完成無限出題、位數選擇、第二列 ×10 及口語提示，並列出 node multiplication-core.test.js、python run-tests.py 及 390px 驗收。

- [ ] Step 5: 在 ../專案總表.md 的 multiplication-board 條目補充：練習分頁支援被乘數一至四位數選擇、無限出題、第二列實際十位值與口語提示。檢查上層 diff，不能把既有無關檔案加入 stage。

- [ ] Step 6: 在兩個相關 repository 都執行 git diff --check。multiplication-board repo 只提交本功能的檔案；上層 repo 若有更新，只提交專案總表那一行。

- [ ] Step 7: 在 multiplication-board repo 提交專案紀錄：

    git add DECISIONS.md CHANGELOG.md CLAUDE.md handoff.md
    git commit -m "docs: record unlimited array practice release"

## 最終驗收清單

- [ ] node multiplication-core.test.js 通過。
- [ ] python run-tests.py 通過，無 pageerror 或 console error。
- [ ] 一至四位數選擇會產生相符位數的被乘數。
- [ ] 第一列使用乘數個位。
- [ ] 第二列顯示並計算 ×10、×20 等實際十位值，不顯示主要的 ×1。
- [ ] 第二列標記左移一位且視覺上對齊十位。
- [ ] 立即顯示 個位＋十位×10＝乘數 的重複次數等式。
- [ ] 錯誤第二列會收到十位／10 次的解釋。
- [ ] 答對後可無限產生下一題並累計已完成題數。
- [ ] 探索與挑戰既有流程仍通過。
- [ ] 每個被修改的程式或測試檔旁都有依規則保留的 .bak。
