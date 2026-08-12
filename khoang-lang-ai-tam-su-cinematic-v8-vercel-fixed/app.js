const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = {
  messages: [],
  mood: null,
  started: false,
  turn: 0,
  usedPhrases: new Set(),
  profile: {
    topics: new Set(),
    needs: new Set(),
    patterns: new Set(),
    people: [],
    keyPhrases: [],
    lastEmotion: null
  }
};

const home = $("#homeView");
const chat = $("#chatView");
const reflection = $("#reflectionView");
const messagesEl = $("#chatMessages");
const startInput = $("#startInput");
const chatInput = $("#chatInput");

function switchView(from, to) {
  from.classList.add("hidden");
  to.classList.remove("hidden");
  to.classList.add("enter");
  setTimeout(() => to.classList.remove("enter"), 900);
  if (to === chat) requestAnimationFrame(() => scrollChatToLatest(false));
}

function addMessage(role, text) {
  state.messages.push({ role, text });
  const el = document.createElement("article");
  el.className = `message ${role}`;
  el.innerHTML = `
    <div class="message-meta">${role === "ai" ? "khoảng lặng" : "cậu"}</div>
    <div class="message-body"></div>
  `;
  el.querySelector(".message-body").textContent = normalizeVietnamese(text);
  messagesEl.appendChild(el);
  requestAnimationFrame(() => scrollChatToLatest(true));
}

function scrollChatToLatest(smooth = true) {
  // The chat area scrolls internally; the user never needs to drag the page scrollbar.
  requestAnimationFrame(() => {
    messagesEl.scrollTo({
      top: Math.max(0, messagesEl.scrollHeight - messagesEl.clientHeight),
      behavior: smooth ? "smooth" : "auto"
    });
  });
}

function showTyping() {
  const el = document.createElement("article");
  el.className = "message ai";
  el.id = "typingMessage";
  el.innerHTML = `
    <div class="message-meta">khoảng lặng</div>
    <div class="typing"><i></i><i></i><i></i></div>
  `;
  messagesEl.appendChild(el);
  requestAnimationFrame(() => scrollChatToLatest(true));
}

function hideTyping() {
  $("#typingMessage")?.remove();
}


/* =========================================================
   KHOẢNG LẶNG — PSYCHOLOGY CONVERSATION ENGINE v5
   This is psychology-informed conversational logic, not diagnosis.
   It is designed to:
   1) hold emotion before solving,
   2) infer the user's need from context,
   3) notice common cognitive/emotional patterns,
   4) remember themes across the session,
   5) give specific, gentle advice,
   6) ask fewer, better questions.
   ========================================================= */

const PATTERNS = {
  safety: [
    /muốn chết|không muốn sống|không muốn tồn tại|tự tử|tự sát|tự làm đau|làm hại bản thân|kết thúc cuộc đời/i
  ],
  breakup: [
    /chia tay|chia đôi|mất người yêu|người yêu cũ|ex\b|bỏ mình|bỏ rơi|không còn yêu/i
  ],
  unrequited: [
    /crush|đơn phương|thích người ta|người ta không thích|không được đáp lại|không có tình cảm|người mình thích.*(có ny|có người yêu|có bồ)|thích.*(đã có ny|đã có người yêu|có bồ)/i
  ],
  relationship: [
    /người yêu|bạn trai|bạn gái|mối quan hệ|nhắn tin|lạnh nhạt|ghost|phản bội|cắm sừng|ghen|tin tưởng/i
  ],
  family: [
    /bố mẹ|ba mẹ|cha mẹ|gia đình|bố|mẹ|ba|má|anh trai|chị gái|em trai|em gái/i
  ],
  friendship: [
    /bạn thân|bạn bè|nhóm bạn|bạn cũ|bị bỏ rơi|không ai chơi|cãi nhau với bạn/i
  ],
  academic: [
    /điểm|thi|kiểm tra|bài tập|học|trường|lớp|đại học|thi cử|thành tích|học hành/i
  ],
  loneliness: [
    /cô đơn|một mình|không ai|không có ai|chẳng ai|không được hiểu|không ai hiểu/i
  ],
  anxiety: [
    /lo|sợ|bất an|hoảng|căng thẳng|stress|áp lực|overthinking|nghĩ mãi|sợ hãi|hoang mang/i
  ],
  sadness: [
    /buồn|khóc|trống rỗng|mệt mỏi|thất vọng|bất lực|tủi thân|đau lòng|nặng lòng|chán/i
  ],
  anger: [
    /tức|giận|bực|khó chịu|ức chế|phẫn nộ|cay|điên|không chịu nổi/i
  ],
  shame: [
    /xấu hổ|nhục|quê|đáng xấu hổ|mình tệ|mình kém|vô dụng|không đủ tốt|thua kém/i
  ],
  guilt: [
    /có lỗi|tội lỗi|hối hận|giá như|lỗi tại mình|mình sai|tự trách/i
  ],
  rejection: [
    /bị từ chối|từ chối|không chọn mình|không cần mình|bị bỏ|bị phũ|không được chọn/i
  ],
  selfWorth: [
    /vô dụng|vô giá trị|không đủ tốt|không bằng ai|kém cỏi|thất bại|mình chẳng là gì/i
  ],
  burnout: [
    /kiệt sức|cạn năng lượng|mệt rã|không muốn làm gì|chán mọi thứ|quá tải/i
  ],
  uncertainty: [
    /không biết phải làm gì|không biết nên|phân vân|rối|bế tắc|không biết chọn|nên hay không/i
  ],
  communication: [
    /nói thế nào|nên nhắn gì|nên nói gì|làm sao nói|xin lỗi|nói chuyện với|đối thoại/i
  ]
};

const EMOTION_WEIGHTS = {
  sadness: [/buồn|khóc|đau|trống rỗng|tủi|thất vọng|nặng lòng/i],
  anxiety: [/lo|sợ|hoảng|bất an|stress|áp lực|căng thẳng|overthinking/i],
  anger: [/tức|giận|bực|ức chế|phẫn nộ|cay/i],
  shame: [/xấu hổ|quê|nhục|vô dụng|kém cỏi|không đủ tốt/i],
  guilt: [/có lỗi|hối hận|giá như|tự trách|mình sai/i],
  longing: [/nhớ|thương|mong|muốn quay lại|không quên/i],
  loneliness: [/cô đơn|một mình|không ai|không được hiểu/i],
  relief: [/nhẹ nhõm|ổn hơn|đỡ hơn|bình tĩnh hơn/i]
};

const NEEDS = {
  validation: [/chỉ muốn được hiểu|muốn ai đó hiểu|không ai hiểu|mình chỉ cần/i],
  comfort: [/an ủi|ôm|vỗ về|mệt quá|chịu không nổi|cần một người/i],
  advice: [/phải làm sao|nên làm gì|cho mình lời khuyên|mình nên/i],
  clarity: [/tại sao|vì sao|không hiểu|nghĩ mãi|muốn hiểu/i],
  decision: [/nên chọn|có nên|nên tiếp tục|nên dừng|có nên nhắn/i],
  expression: [/muốn nói|không biết nói|khó nói|không thể nói/i],
  reassurance: [/mình có sai không|mình có tệ không|có phải lỗi mình|liệu mình/i]
};

function repairSplitVietnameseLetters(text = "") {
  // Repairs accidental output such as "c ậ u" / "t h ấ y" without
  // touching normal multi-letter words or sentence spacing.
  return text.replace(
    /(^|[^\p{L}\p{M}])((?:[\p{L}\p{M}]\s+){2,7}[\p{L}\p{M}])(?=$|[^\p{L}\p{M}])/gu,
    (_, prefix, chunk) => prefix + chunk.replace(/\s+/g, "")
  );
}

function normalizeVietnamese(text = "") {
  return repairSplitVietnameseLetters(
    String(text)
      .normalize("NFC")
      .replace(/[\u200B-\u200D\uFEFF\u2060]/gu, "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\t\f\v ]+/g, " ")
      .replace(/ +([,.!?;:])/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function detectTopics(text) {
  const t = normalizeVietnamese(text);
  const found = [];
  for (const [topic, rules] of Object.entries(PATTERNS)) {
    if (rules.some(r => r.test(t))) found.push(topic);
  }
  return found;
}

function detectEmotions(text) {
  const t = normalizeVietnamese(text);
  const scores = {};
  for (const [emotion, rules] of Object.entries(EMOTION_WEIGHTS)) {
    scores[emotion] = rules.reduce((n, r) => n + (r.test(t) ? 1 : 0), 0);
  }
  return Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([emotion]) => emotion);
}

function detectNeeds(text) {
  const t = normalizeVietnamese(text);
  return Object.entries(NEEDS)
    .filter(([, rules]) => rules.some(r => r.test(t)))
    .map(([need]) => need);
}

function detectCognitivePatterns(text) {
  const t = normalizeVietnamese(text);
  const patterns = [];
  if (/(luôn luôn|lúc nào cũng|chẳng bao giờ|không bao giờ|tất cả mọi thứ)/i.test(t)) patterns.push("all_or_nothing");
  if (/(mình vô dụng|mình kém|mình thất bại|mình không đủ)/i.test(t)) patterns.push("global_self_judgment");
  if (/(chắc chắn|kiểu gì cũng|thế nào cũng|sẽ chẳng bao giờ)/i.test(t)) patterns.push("catastrophizing");
  if (/(người ta nghĩ|họ chắc chắn nghĩ|chắc họ|chắc chắn họ)/i.test(t)) patterns.push("mind_reading");
  if (/(giá như|lẽ ra|đáng lẽ)/i.test(t)) patterns.push("counterfactual");
  if (/(tại mình|lỗi mình|do mình hết)/i.test(t)) patterns.push("self_blame");
  if (/(phải|nhất định phải|không được phép)/i.test(t)) patterns.push("should_statement");
  if (/(không bằng|thua|kém hơn|hơn mình)/i.test(t)) patterns.push("comparison");
  return patterns;
}

function updatePsychProfile(text) {
  const clean = normalizeVietnamese(text);
  const topics = detectTopics(clean);
  const emotions = detectEmotions(clean);
  const needs = detectNeeds(clean);
  const patterns = detectCognitivePatterns(clean);

  topics.forEach(x => state.profile.topics.add(x));
  needs.forEach(x => state.profile.needs.add(x));
  patterns.forEach(x => state.profile.patterns.add(x));
  state.profile.lastEmotion = emotions[0] || state.profile.lastEmotion;
  state.mood = topics[0] || "unknown";

  // Keep a tiny amount of meaningful context, not a full personal dossier.
  if (clean.length > 20) {
    state.profile.keyPhrases.push(clean.slice(0, 180));
    state.profile.keyPhrases = state.profile.keyPhrases.slice(-5);
  }

  return { topics, emotions, needs, patterns };
}

function hasTopic(name) {
  return state.profile.topics.has(name);
}

function pick(arr, salt = 0) {
  if (!Array.isArray(arr) || !arr.length) return "";
  const unseen = arr.filter(item => !state.usedPhrases.has(item));
  const pool = unseen.length ? unseen : arr;
  const item = pool[Math.abs(state.turn * 7 + salt * 13 + pool.length) % pool.length];
  // Never repeat an exact sentence while this conversation is alive.
  state.usedPhrases.add(item);
  if (state.usedPhrases.size > 180) {
    const keep = [...state.usedPhrases].slice(-120);
    state.usedPhrases = new Set(keep);
  }
  return item;
}

const GENZ = {
  abbreviations: [
    [/\bbạn\b/giu, "bn"], [/\bbao giờ\b/giu, "bg"], [/\blàm sao\b/giu, "lms"],
    [/\blàm gì\b/giu, "lmj"], [/\bkhông biết\b/giu, "kb"], [/\bvậy mà\b/giu, "v mà"],
    [/\bnhư thế nào\b/giu, "ntn"]
  ],
  softeners: [":)))", ":((", ":)", "🥲", "😭", "=)", "..."],
  connectors: ["kiểu", "thật ra", "nói thật nha", "mà nè", "ờm", "tbh", "nói nhỏ này"]
};

function humanizeGenZ(text, salt = 0) {
  let out = text;
  // Keep the emotional core readable; use slang lightly rather than replacing every word.
  if (state.turn > 0 && state.turn % 3 === 1) {
    for (const [re, rep] of GENZ.abbreviations.slice(0, 2 + (salt % 2))) out = out.replace(re, rep);
  }
  if (state.turn % 4 === 0 && !/[!?]$/.test(out)) out += " :))";
  else if (state.turn % 5 === 0 && !/[!?]$/.test(out)) out += " ...";
  return out;
}

const RESPONSE_LIBRARY = {
  opening: {
    general: [
      "Mình nghe cậu. Và trước khi mình cố tìm cách giải quyết, mình muốn cậu biết rằng cảm giác cậu đang có không phải là thứ cần phải xấu hổ hay vội vàng giấu đi.",
      "Mình ở đây với câu chuyện này. Cậu không cần phải kể thật hoàn hảo hay sắp xếp mọi thứ cho hợp lý; cứ nói theo cách tự nhiên nhất của cậu.",
      "Có vẻ chuyện này đã chiếm khá nhiều chỗ trong lòng cậu rồi. Mình chưa muốn vội sửa nó bằng một câu lời khuyên, nhưng mình cũng không muốn để cậu phải tự ôm nó một mình.",
      "Mình nghe được rằng chuyện này không đơn giản chỉ là một sự việc xảy ra rồi thôi. Nó đang chạm vào một điều khá quan trọng với cậu, nên việc cậu cảm thấy nặng lòng là điều có thể hiểu được."
    ],
    unrequited: [
      "Ừm... cái này đau thật đó bn :((. Thích một người mà biết họ đã có người bên cạnh rồi, cảm giác hụt xuống một nhịp là chuyện rất dễ hiểu. Cậu không cần phải giả vờ là mình ổn đâu.",
      "Nghe câu này là mình hiểu tại sao cậu buồn rồi. Không phải vì cậu yếu đâu, chỉ là cậu đã đặt tình cảm vào một người mà hiện tại họ không còn một khoảng trống dành cho cậu. Khó chịu thật sự :(((",
      "Không sao đâu, bn. Mình hiểu kiểu cảm giác thích ai đó rất nhiều rồi lại nhận ra người ta đã thuộc về một mối quan hệ khác nó chưng hửng thế nào. Cứ kể mình nghe thêm một chút, mình ở đây.",
      "Cậu được phép buồn vì chuyện này nha. Dù hai người chưa từng yêu nhau, cảm giác mất đi một khả năng mà mình từng hy vọng vẫn có thể đau như thật vậy. Đừng tự mắng mình vì đã thích người ta.",
      "Tbh, mình không nghĩ cậu cần nghe câu kiểu 'thôi quên đi'. Nếu dễ quên thế thì cậu đã chẳng buồn. Mình muốn hiểu xem cậu đang tiếc người ấy, tiếc cơ hội, hay tiếc cái tương lai cậu từng tưởng tượng ra."
    ],
    sad: [
      "Mình nghe thấy một nỗi buồn khá sâu trong điều cậu vừa nói. Có những lúc mình không cần ai lập tức làm cho mình vui; mình chỉ cần một nơi mà nỗi buồn được đặt xuống mà không bị phán xét.",
      "Cậu không cần phải cố tỏ ra ổn ngay lúc này. Có thể hôm nay lòng cậu đang mệt thật. Và một ngày như vậy không làm cậu yếu đi, cũng không xóa đi những điều tốt đẹp ở cậu.",
      "Mình tiếc vì cậu đang phải mang cảm giác này. Nếu cậu đã cố gắng chịu đựng nó một mình một thời gian, thì việc cuối cùng cũng nói ra là một điều đáng được trân trọng."
    ],
    anxiety: [
      "Mình có cảm giác đầu cậu đang phải chạy quá nhiều thứ cùng một lúc. Khi lo lắng kéo dài, mọi khả năng xấu thường trông giống như sự thật. Mình muốn cùng cậu tách từng thứ ra để nó bớt nặng.",
      "Cậu không cần phải giải quyết cả tương lai trong một lần. Điều cậu đang sợ có thể rất thật về mặt cảm xúc, nhưng nó chưa chắc đã là điều chắc chắn sẽ xảy ra.",
      "Nếu đầu óc đang quá ồn, mình không muốn bắt cậu phải 'ngừng nghĩ'. Mình muốn hiểu xem nỗi lo đang cố bảo vệ cậu khỏi điều gì."
    ],
    anger: [
      "Mình nghe được sự ấm ức trong lời cậu. Đằng sau một cơn giận thường có một điều gì đó đã bị chạm vào: sự tôn trọng, niềm tin, ranh giới hoặc cảm giác mình không được đối xử công bằng.",
      "Cậu không cần phải lập tức trở nên rộng lượng với người đã làm cậu tổn thương. Trước hết, mình muốn hiểu điều gì đã khiến cậu đau và tức đến mức này.",
      "Có thể cậu đã nhịn khá lâu rồi. Nếu vậy, cơn giận này không xuất hiện từ khoảng không; nó có một câu chuyện phía sau."
    ],
    relationship: [
      "Chuyện tình cảm thường đau ở nhiều lớp cùng lúc: nhớ một người, mất một thói quen, mất cảm giác được lựa chọn, rồi lại tự hỏi mình đã làm gì sai. Vì thế nếu cậu đang rất khó chịu với chính cảm xúc của mình, mình muốn cậu nhẹ tay với bản thân một chút.",
      "Mình sẽ không vội bảo cậu phải quên, phải quay lại hay phải bước đi. Trước hết, mình muốn hiểu điều gì ở mối quan hệ này đang làm cậu đau nhất.",
      "Có những người không chỉ là một người mình thích; họ trở thành một phần trong nhịp sống của mình. Khi điều đó thay đổi, khoảng trống để lại có thể lớn hơn mình tưởng."
    ],
    breakup: [
      "Mất một mối quan hệ không chỉ là mất một người. Đôi khi mình còn mất những dự định, thói quen, những phiên bản của chính mình khi ở cạnh họ. Vì vậy việc cậu vẫn buồn, vẫn nhớ hoặc vẫn quay lại nghĩ về chuyện ấy không có nghĩa cậu đang yếu.",
      "Mình không muốn dùng những câu như 'rồi cậu sẽ quên thôi' để phủ lên cảm xúc này. Cậu có thể cần thời gian để vừa thương một người, vừa học cách không đánh mất mình trong nỗi nhớ đó.",
      "Nếu có một phần trong cậu vẫn hy vọng, một phần khác lại muốn bước đi, hai phần đó cùng tồn tại cũng không có gì bất thường. Cậu không cần ép mình chọn một cảm xúc duy nhất ngay hôm nay."
    ],
    academic: [
      "Mình hiểu vì sao một kết quả học tập có thể làm cậu đau hơn người khác nhìn thấy. Khi mình đã bỏ công sức mà kết quả không như mong muốn, điều đau nhất đôi khi không phải con điểm mà là cảm giác 'mình cố thế vẫn chưa đủ'.",
      "Một lần làm chưa tốt có thể cho cậu thông tin về cách học, thời gian, kiến thức hoặc áp lực lúc làm bài. Nó không có đủ quyền để trở thành bản án về năng lực hay giá trị của cậu.",
      "Nếu cậu đang thất vọng, mình không muốn biến cảm giác ấy thành một bài giảng động lực. Cậu có quyền buồn vì mình đã kỳ vọng."
    ],
    family: [
      "Chuyện gia đình thường khó ở chỗ mình vừa thương người ta, vừa bị chính họ làm tổn thương. Vì vậy cảm xúc có thể rất mâu thuẫn: thương, giận, tủi, biết ơn và muốn được hiểu cùng lúc.",
      "Cậu không có nghĩa vụ phải phủ nhận cảm xúc của mình chỉ vì người làm cậu đau là người thân. Một điều có thể vừa là tình cảm gia đình, vừa là một điều khiến cậu tổn thương.",
      "Nếu ở nhà cậu phải giữ rất nhiều điều trong lòng, mình hiểu vì sao đến lúc nói ra nó có thể thành một khối cảm xúc rất lớn."
    ],
    friendship: [
      "Bị tổn thương bởi một người bạn đôi khi đau rất khác. Mình từng tin người đó, nên khi niềm tin bị lệch đi, mình không chỉ buồn về việc xảy ra mà còn bắt đầu nghi ngờ những kỷ niệm và sự chân thành trước đó.",
      "Cậu không cần phải quyết định ngay người đó có đáng để giữ trong cuộc đời hay không. Trước hết, mình muốn cậu được phép thừa nhận rằng chuyện này đã làm cậu đau.",
      "Một tình bạn kết thúc hoặc thay đổi có thể để lại cảm giác bị thay thế, bị bỏ rơi hoặc không còn quan trọng. Những cảm giác ấy đáng được nói ra chứ không cần bị gạt đi."
    ],
    loneliness: [
      "Cô đơn không chỉ là không có ai bên cạnh. Có khi mình ở giữa rất nhiều người nhưng vẫn có cảm giác không ai thật sự nhìn thấy mình. Nếu cậu đang ở trong cảm giác đó, mình không muốn xem nhẹ nó.",
      "Mình nghĩ điều đau nhất của cô đơn đôi khi là việc mình bắt đầu tin rằng không ai có thể hiểu mình. Nhưng việc cậu chưa gặp được một người hiểu mình đúng cách không có nghĩa là cậu không đáng được hiểu.",
      "Nếu lâu rồi cậu không có một nơi để nói thật lòng, mình có thể bắt đầu rất chậm. Cậu không cần kể tất cả trong một lần."
    ],
    shame: [
      "Cảm giác xấu hổ thường khiến mình muốn trốn khỏi chính mình. Nhưng việc cậu đã làm một điều mình không hài lòng không đồng nghĩa toàn bộ con người cậu trở nên đáng xấu hổ.",
      "Mình muốn tách một điều cậu đã làm khỏi con người cậu. Hành vi có thể cần sửa, lời nói có thể cần xin lỗi, nhưng điều đó không có nghĩa cậu là một người không đáng được tử tế.",
      "Khi đang xấu hổ, não mình rất dễ phóng đại khoảnh khắc ấy thành 'ai cũng sẽ nhớ', 'mọi người đều nghĩ xấu về mình'. Mình muốn cùng cậu kiểm tra xem đâu là sự thật và đâu là tiếng nói của nỗi xấu hổ."
    ],
    guilt: [
      "Nếu cậu đang tự trách, mình muốn cậu chậm lại trước khi kết luận rằng mọi thứ đều là lỗi của mình. Có trách nhiệm với phần mình làm khác với việc nhận toàn bộ trách nhiệm cho một chuyện có nhiều yếu tố.",
      "Cảm giác có lỗi đôi khi cho thấy cậu rất quan tâm đến người khác. Nhưng nếu sự hối hận biến thành việc liên tục trừng phạt bản thân, nó không còn giúp cậu sửa chữa nữa.",
      "Nếu thật sự có phần cậu làm chưa đúng, mình có thể cùng cậu nhìn thẳng vào nó mà không biến nó thành câu 'mình là người tệ'. Sửa một hành động và ghét chính mình là hai chuyện rất khác."
    ],
    rejection: [
      "Bị từ chối thường chạm vào một câu hỏi rất đau: 'Có phải mình không đủ tốt không?' Nhưng một người không chọn cậu không phải là bằng chứng rằng cậu thiếu giá trị.",
      "Mình biết lý trí có thể hiểu 'không hợp nhau', nhưng cảm xúc lại vẫn đau. Cậu không cần phải giả vờ rằng mình không buồn chỉ vì câu chuyện đó có vẻ hợp lý.",
      "Bị bỏ lại dễ khiến mình muốn tìm một lỗi nào đó ở bản thân để giải thích. Nhưng đôi khi sự không phù hợp chỉ là sự không phù hợp, không phải một khuyết điểm cần phải sửa."
    ],
    burnout: [
      "Khi đã kiệt sức, ngay cả những việc bình thường cũng có thể trông như một ngọn núi. Mình không muốn gọi đó là lười. Có thể hệ thống của cậu đã phải chạy quá lâu mà chưa được nghỉ đúng nghĩa.",
      "Cậu không cần biến mình thành một cỗ máy chỉ vì trước đây mình từng làm được rất nhiều. Có những giai đoạn điều cần làm không phải tăng tốc mà là giảm tải.",
      "Nếu cậu đang cạn năng lượng, lời khuyên 'cố thêm một chút' có thể chỉ làm cậu thấy có lỗi hơn. Mình muốn nhìn xem thứ gì đang tiêu hao cậu nhiều nhất trước."
    ],
    unknown: [
      "Mình nghe cậu. Và dù cậu chưa gọi tên được chính xác điều mình đang cảm thấy, nó vẫn đáng được quan tâm.",
      "Cậu có thể kể lộn xộn cũng được. Những chuyện quan trọng với mình hiếm khi đi ra thành một câu chuyện gọn gàng ngay từ đầu.",
      "Mình không cần cậu phải có câu trả lời ngay. Mình muốn hiểu cậu đang ở đâu trong câu chuyện này trước."
    ]
  },

  reflection: {
    global_self_judgment: "Mình để ý cậu đang đi từ một chuyện cụ thể sang một kết luận rất lớn về chính mình. 'Mình làm chưa tốt' và 'mình là người không đủ tốt' nghe gần nhau, nhưng về tâm lý chúng là hai điều hoàn toàn khác.",
    catastrophizing: "Có vẻ đầu cậu đang nhảy khá xa tới kịch bản tệ nhất. Mình không phủ nhận nỗi sợ đó, chỉ muốn tách 'điều có thể xảy ra' khỏi 'điều chắc chắn sẽ xảy ra' để cậu không phải chịu trước một nỗi đau chưa chắc đến.",
    mind_reading: "Mình nghe thấy một phần cậu đang cố đoán suy nghĩ của người khác để tìm một lời giải thích. Nhưng mình chưa thật sự biết họ nghĩ gì. Có thể mình sẽ giúp cậu tách điều mình biết, điều mình đoán và điều mình cần hỏi trực tiếp.",
    counterfactual: "Câu 'giá như' thường giữ mình lại rất lâu vì nó tạo cảm giác rằng nếu mình tìm đúng một điểm sai trong quá khứ thì hiện tại sẽ được sửa. Nhưng mình chỉ có thể thay đổi cách mình nhìn và hành động từ bây giờ.",
    self_blame: "Mình muốn cậu xem lại phần trách nhiệm của mình một cách công bằng. Nhận phần mình là trưởng thành; nhận hết mọi thứ về mình chỉ để có một lời giải thích đơn giản thì đôi khi lại là đang đối xử quá nặng với bản thân.",
    comparison: "Mình thấy cậu đang dùng người khác như một chiếc thước để đo giá trị của mình. So sánh có thể cho mình thông tin, nhưng nó không thể kể hết câu chuyện về hoàn cảnh, tốc độ và hành trình của hai người.",
    all_or_nothing: "Có vẻ một vài trải nghiệm đang bị gom thành 'luôn luôn' hoặc 'không bao giờ'. Khi mình đang đau, não thường thích những kết luận tuyệt đối vì chúng dễ hiểu hơn. Mình muốn thử tìm xem có một phần thực tế nào nằm ở giữa không.",
    should_statement: "Từ 'phải' nghe có vẻ đang đặt lên cậu một tiêu chuẩn rất cao. Mình muốn hỏi xem tiêu chuẩn đó thực sự đến từ điều cậu cần, hay từ điều cậu nghĩ mình buộc phải trở thành."
  },

  advice: {
    relationship: [
      "Nếu đang phân vân về một người, thay vì chỉ hỏi 'họ có yêu mình không?', thử nhìn ba điều: họ đối xử với cậu thế nào một cách nhất quán, cậu cảm thấy mình có thể là chính mình đến đâu, và khi có vấn đề hai người có cùng sửa hay chỉ một người luôn cố.",
      "Nếu cậu muốn nhắn cho người ấy trong lúc cảm xúc đang rất cao, hãy viết ra trước nhưng chưa cần gửi ngay. Sau đó đọc lại và hỏi: 'Mình đang muốn kết nối, muốn được xác nhận, hay chỉ đang muốn nỗi đau dịu xuống?' Ba nhu cầu đó có thể cần ba cách khác nhau.",
      "Đừng dùng một khoảnh khắc người ta lạnh nhạt để kết luận toàn bộ giá trị của mối quan hệ. Nhưng cũng đừng dùng vài kỷ niệm đẹp để bỏ qua một kiểu đối xử khiến cậu liên tục tổn thương."
    ],
    friendship: [
      "Một tình bạn đáng giữ không nhất thiết phải hoàn hảo, nhưng thường cần có khả năng sửa chữa: nghe nhau, nhận trách nhiệm và tôn trọng ranh giới. Nếu chỉ có một người liên tục xin lỗi và cố cứu mối quan hệ, đó là một dấu hiệu đáng để nhìn lại.",
      "Nếu cậu đang rất giận một người bạn, đừng cố giải quyết bằng cách nói hết mọi thứ trong một lần. Hãy xác định một hành vi cụ thể đã làm cậu đau, cậu cảm thấy thế nào và cậu cần điều gì thay đổi."
    ],
    family: [
      "Nếu nói chuyện trực tiếp với gia đình dễ biến thành tranh cãi, thử bắt đầu bằng một câu nói về cảm xúc và nhu cầu thay vì một danh sách lỗi: 'Con đang cảm thấy... và điều con cần lúc này là...'. Nó không đảm bảo người kia sẽ hiểu ngay, nhưng giúp cậu nói rõ điều mình cần.",
      "Cậu có thể thương gia đình và vẫn cần ranh giới. Hai điều đó không mâu thuẫn."
    ],
    academic: [
      "Sau khi cảm xúc hạ xuống, mình sẽ không hỏi 'tại sao mình kém' mà hỏi 'lỗi này thuộc loại nào?'. Kiến thức, chiến lược làm bài, thời gian hay áp lực? Mỗi nguyên nhân cần một cách sửa khác nhau.",
      "Nếu cậu đang học trong trạng thái hoảng, mục tiêu đầu tiên nên là lấy lại sự rõ ràng chứ không phải nhồi thêm giờ. Một kế hoạch nhỏ có thể hiệu quả hơn việc tự ép mình học đến kiệt sức."
    ],
    anxiety: [
      "Thử chia một nỗi lo thành ba cột: điều mình biết chắc, điều mình đang dự đoán, và điều mình có thể làm trong hôm nay. Cột thứ ba là nơi cậu lấy lại quyền chủ động.",
      "Khi overthinking kéo dài, đừng tranh luận với từng suy nghĩ. Hãy hỏi một câu đơn giản: 'Mình đang giải quyết vấn đề, hay đang lặp lại cùng một vòng suy nghĩ?' Nếu là vế sau, mình cần một hành động hoặc một khoảng nghỉ chứ không cần thêm phân tích."
    ],
    sadness: [
      "Khi đang buồn sâu, mục tiêu đầu tiên không phải là trở nên vui. Hãy giảm tải cho cơ thể và đầu óc trước: nghỉ, ăn uống đủ, tạm rời khỏi thứ đang kích hoạt cảm xúc và tìm một người an toàn nếu có thể.",
      "Đừng đưa ra những quyết định lớn chỉ để thoát khỏi cảm giác khó chịu của hôm nay. Cho mình một khoảng thời gian để cảm xúc lắng xuống rồi mới quyết định điều có ảnh hưởng lâu dài."
    ],
    shame: [
      "Nếu cậu đã làm điều mình hối tiếc, hãy tách ba bước: thừa nhận điều đã xảy ra, sửa phần có thể sửa, rồi ngừng dùng nó như một lý do để trừng phạt bản thân mãi mãi.",
      "Cảm giác xấu hổ muốn cậu trốn đi; trách nhiệm lại muốn cậu nhìn thẳng. Mục tiêu là trách nhiệm mà không tự hành hạ mình."
    ],
    guilt: [
      "Hãy thử viết hai câu: 'Phần trách nhiệm thật sự của mình là...' và 'Những điều nằm ngoài khả năng kiểm soát của mình là...'. Cách này giúp cảm giác có lỗi trở nên cụ thể hơn.",
      "Nếu có điều cần xin lỗi, một lời xin lỗi tốt tập trung vào hành vi, tác động và cách sửa chữa; không cần biến nó thành 'mình là người tệ nhất'."
    ],
    loneliness: [
      "Nếu cảm giác cô đơn kéo dài, đừng chỉ chờ một người đặc biệt xuất hiện. Một vài kết nối nhỏ và đều đặn cũng có thể giúp hệ thần kinh bớt cảm giác bị tách khỏi người khác: một cuộc nói chuyện, một hoạt động chung, một người lớn đáng tin.",
      "Đôi khi mục tiêu đầu tiên không phải 'có thật nhiều bạn', mà là có ít nhất một nơi mình được nói thật mà không phải diễn."
    ],
    burnout: [
      "Hãy nhìn xem thứ gì đang tiêu hao cậu nhiều nhất: học tập, kỳ vọng, xung đột, thiếu ngủ hay việc phải liên tục tỏ ra ổn. Sửa đúng nguồn tiêu hao thường quan trọng hơn cố ép mình có thêm động lực.",
      "Nếu cơ thể và đầu óc đã quá tải, nghỉ ngơi không phải phần thưởng sau khi hoàn thành hết mọi việc. Nó là một phần của việc có thể tiếp tục."
    ],
    unknown: [
      "Nếu chưa biết phải làm gì, mình sẽ chưa bắt cậu đưa ra quyết định lớn. Hãy tìm một bước nhỏ làm tình hình bớt tệ đi 5%, rồi từ đó nhìn tiếp.",
      "Một câu hỏi hữu ích lúc này là: 'Điều gì đang nằm trong khả năng kiểm soát của mình, dù chỉ 1%?' Bắt đầu từ đó thường dễ hơn việc cố giải quyết toàn bộ câu chuyện."
    ]
  },

  questions: {
    unrequited: [
      "Cậu buồn nhất vì người ấy có ny, hay vì điều đó làm cậu thấy mình đã chậm một bước?",
      "Nếu được nói thật một câu mà không sợ bị đánh giá, cậu muốn nói gì về người ấy lúc này?",
      "Cậu muốn giữ tình cảm này một thời gian để tự hiểu nó, hay đang muốn tìm cách bước ra nhẹ nhàng hơn?",
      "Cậu có đang tự so mình với người yêu của họ không? Nếu có thì mình muốn cùng cậu gỡ chỗ đó trước."
    ],
    relationship: [
      "Điều cậu đang cần nhất từ người ấy là được yêu, được giải thích, được tôn trọng hay được một lần cảm thấy mình được lựa chọn?",
      "Nếu bỏ qua câu hỏi 'họ có còn yêu mình không?', cậu muốn mối quan hệ này khiến cậu cảm thấy thế nào?",
      "Điều gì trong cách họ đối xử với cậu khiến cậu đau nhất?"
    ],
    breakup: [
      "Cậu đang nhớ chính con người ấy, hay nhớ cảm giác và cuộc sống mà cậu từng có khi hai người còn ở bên nhau?",
      "Nếu người ấy quay lại nhưng mọi thứ vẫn giống hệt trước đây, cậu có thật sự muốn quay lại không?",
      "Điều khó buông nhất với cậu là người ấy, kỷ niệm, hy vọng hay cảm giác mình đã không đủ?"
    ],
    anxiety: [
      "Điều tệ nhất mà đầu cậu đang dự đoán là gì?",
      "Trong chuyện này, phần nào là sự thật cậu biết chắc và phần nào là điều cậu đang suy đoán?",
      "Nếu ngày mai mọi thứ không hoàn hảo nhưng vẫn ổn, cậu mong điều gì sẽ xảy ra?"
    ],
    academic: [
      "Điểm số đang làm cậu buồn, hay nó đang khiến cậu sợ rằng mình sẽ không đạt được điều cậu mong muốn?",
      "Nếu xem lần này như dữ liệu thay vì phán quyết, cậu nghĩ nguyên nhân lớn nhất nằm ở đâu?",
      "Cậu đang cần một kế hoạch học tốt hơn, hay trước mắt cậu cần được nghỉ và lấy lại tinh thần?"
    ],
    family: [
      "Điều cậu ước người trong gia đình hiểu nhất về cậu lúc này là gì?",
      "Cậu muốn được lắng nghe, được tôn trọng hay được trao thêm không gian?",
      "Trong chuyện này, điều nào cậu có thể nói ra mà không cần giải quyết tất cả cùng một lúc?"
    ],
    friendship: [
      "Điều làm cậu đau nhất là việc người đó đã làm, hay cảm giác rằng tình bạn mà cậu tin tưởng không còn giống trước?",
      "Cậu muốn sửa mối quan hệ này, hay muốn tìm một cách để bước ra mà không còn tự trách?",
      "Nếu đặt ranh giới cho tình bạn này, điều tối thiểu cậu cần được tôn trọng là gì?"
    ],
    sadness: [
      "Nếu phải chọn một điều đang nặng nhất trong lòng cậu lúc này, đó sẽ là điều gì?",
      "Cậu muốn mình chỉ lắng nghe, cùng cậu gỡ vấn đề, hay đưa ra một hướng để cậu thử?",
      "Điều gì cậu ước có một người nói với cậu ngay lúc này?"
    ],
    loneliness: [
      "Cậu cảm thấy cô đơn vì không có người bên cạnh, hay vì có người nhưng không cảm thấy được họ hiểu?",
      "Lần gần nhất cậu cảm thấy thật sự được nhìn thấy và thoải mái là khi nào?",
      "Cậu đang muốn có một người để nói chuyện, hay muốn cảm giác mình thực sự thuộc về một nơi nào đó?"
    ],
    shame: [
      "Cậu đang sợ người khác nghĩ gì về mình, hay chính cậu đang nhìn mình bằng một ánh mắt rất khắt khe?",
      "Nếu một người cậu thương mắc đúng lỗi này, cậu có nói với họ những điều cậu đang nói với chính mình không?",
      "Có phần nào của chuyện này cậu có thể sửa chữa thay vì tiếp tục trừng phạt bản thân không?"
    ],
    guilt: [
      "Phần nào thật sự thuộc trách nhiệm của cậu, và phần nào cậu đang nhận thay cho người khác?",
      "Cậu muốn sửa điều đã xảy ra, hay cậu đang cố quay ngược thời gian để nó chưa từng xảy ra?",
      "Nếu đã làm điều có thể sửa, bước sửa chữa tử tế nhất với cả người kia và chính cậu sẽ là gì?"
    ],
    unknown: [
      "Điều gì đang chiếm nhiều chỗ nhất trong đầu cậu?",
      "Cậu muốn mình chỉ ở đây nghe cậu, hay muốn mình cùng cậu tìm một hướng giải quyết?",
      "Nếu chỉ cần làm nhẹ đi một phần của hôm nay, cậu muốn phần nào nhẹ đi trước?"
    ]
  }
};

function choosePrimaryTopic(ctx) {
  const priority = [
    "safety", "breakup", "relationship", "family", "friendship",
    "academic", "loneliness", "burnout", "anxiety", "anger",
    "shame", "guilt", "rejection", "sadness"
  ];
  return priority.find(t => ctx.topics.includes(t)) ||
         priority.find(t => state.profile.topics.has(t)) ||
         "unknown";
}

function chooseNeed(ctx, topic) {
  if (ctx.needs.length) return ctx.needs[0];
  if (state.profile.needs.size) return [...state.profile.needs][state.turn % state.profile.needs.size];

  if (["breakup", "relationship", "friendship", "family"].includes(topic)) return "validation";
  if (["anxiety", "sadness", "loneliness", "burnout"].includes(topic)) return "comfort";
  if (["academic", "guilt", "shame"].includes(topic)) return "clarity";
  return "validation";
}

function buildPatternReflection(ctx) {
  const candidates = [
    "global_self_judgment", "catastrophizing", "mind_reading",
    "counterfactual", "self_blame", "comparison",
    "all_or_nothing", "should_statement"
  ];

  const found = candidates.find(p => ctx.patterns.includes(p) || state.profile.patterns.has(p));
  if (!found) return "";
  const base = RESPONSE_LIBRARY.reflection[found];
  const variants = {
    global_self_judgment: [base, "Mình để ý cậu đang biến một việc mình làm chưa ổn thành kết luận về cả con người mình. Hai chuyện đó không giống nhau đâu.", "Một lỗi, một lần thất bại hay một điểm chưa tốt chỉ mô tả một khoảnh khắc; nó không đủ dữ kiện để định nghĩa cả cậu."],
    catastrophizing: [base, "Não mình lúc lo thường nhảy thẳng tới kịch bản tệ nhất rồi coi nó như chuyện đã chắc chắn. Mình thử kéo nó về những gì cậu thật sự biết nhé."],
    mind_reading: [base, "Cậu đang phải đoán suy nghĩ của người khác khá nhiều. Mình tách phần 'mình biết' và phần 'mình đang đoán' ra thì câu chuyện sẽ nhẹ hơn một chút."],
    counterfactual: [base, "Cái bẫy của 'giá như' là nó cho mình cảm giác quá khứ vẫn còn nút undo. Nhưng thứ mình có trong tay bây giờ mới là phần đáng để mình chăm chút."],
    self_blame: [base, "Tự nhận trách nhiệm là một chuyện; nhận hết mọi trách nhiệm về mình lại là chuyện khác. Mình muốn cậu phân biệt hai điều đó."],
    comparison: [base, "Cậu đang lấy một phần câu chuyện của người khác để so với toàn bộ những gì cậu biết về mình. Cách so đó vốn đã không công bằng với cậu rồi."],
    all_or_nothing: [base, "Mình nghe thấy những từ như 'luôn luôn' và 'chẳng bao giờ'. Khi đang đau, đầu óc rất dễ nói bằng hai cực như vậy; mình thử tìm một khoảng ở giữa xem sao."],
    should_statement: [base, "Cái 'mình phải...' đôi khi làm nỗi buồn nặng thêm vì ngoài chuyện đang đau, cậu còn phải chịu áp lực vì nghĩ mình không được phép đau." ]
  };
  return pick(variants[found] || [base], state.turn + 5);
}

function specificAdvice(topic) {
  const map = {
    breakup: "breakup",
    relationship: "relationship",
    friendship: "friendship",
    family: "family",
    academic: "academic",
    anxiety: "anxiety",
    sadness: "sadness",
    shame: "shame",
    guilt: "guilt",
    loneliness: "loneliness",
    burnout: "burnout"
  };
  return pick(RESPONSE_LIBRARY.advice[map[topic] || "unknown"], state.turn + 1);
}

function chooseQuestion(topic) {
  const key = RESPONSE_LIBRARY.questions[topic] ? topic :
    (topic === "rejection" ? "relationship" :
     topic === "breakup" ? "breakup" :
     "unknown");
  return pick(RESPONSE_LIBRARY.questions[key], state.turn + 2);
}

function detectMood(text) {
  const ctx = updatePsychProfile(text);
  if (ctx.topics.includes("safety")) return "safety";
  return choosePrimaryTopic(ctx);
}

function makeReply(text, first = false) {
  const clean = normalizeVietnamese(text);
  const ctx = updatePsychProfile(clean);
  const topic = choosePrimaryTopic(ctx);
  const need = chooseNeed(ctx, topic);

  state.turn += 1;

  if (topic === "safety") {
    return "Mình rất tiếc vì cậu đang phải chịu một cảm giác nặng đến mức nghĩ đến chuyện làm hại bản thân hoặc không muốn tiếp tục. Lúc này mình không muốn tranh luận hay bắt cậu phải ổn ngay. Điều quan trọng nhất là cậu đừng ở một mình với cảm giác đó: hãy tìm một người lớn đáng tin hoặc một người cậu tin tưởng đang ở gần và nói thẳng rằng cậu đang không an toàn. Nếu nguy hiểm đang xảy ra ngay lúc này, hãy tìm trợ giúp khẩn cấp tại nơi cậu đang ở. Mình vẫn có thể lắng nghe cậu ở đây, nhưng một người thật ở gần cần biết để cùng giữ an toàn cho cậu.";
  }

  let openingTopic = topic;
  if (openingTopic === "rejection") openingTopic = "relationship";
  if (!RESPONSE_LIBRARY.opening[openingTopic]) openingTopic = "general";

  let reply = pick(RESPONSE_LIBRARY.opening[openingTopic], clean.length + state.turn);

  // Need-aware response: comfort is always present; advice/question are conditional.
  const reflection = buildPatternReflection(ctx);

  if (reflection && (ctx.patterns.length || state.profile.patterns.size)) {
    reply += `\n\n${reflection}`;
  }

  if (need === "advice" || need === "decision" || need === "clarity") {
    reply += `\n\n${specificAdvice(topic)}`;
  } else if (need === "reassurance") {
    reply += `\n\n${pick([
      "Mình chưa muốn để một chuyện xảy ra biến thành bản án dành cho chính cậu. Có phần thuộc về cậu, có phần là lựa chọn của người khác, và cũng có phần đơn giản là ngoài tầm tay mình.",
      "Khoan tự kết luận rằng tất cả là do cậu nha. Mình muốn tách từng chuyện ra nhìn cho rõ, chứ không gom hết lại thành 'mình tệ'.",
      "Cậu có thể nhận phần mình làm chưa ổn mà vẫn tử tế với chính mình. Hai chuyện đó hoàn toàn đi cùng nhau được.",
      "Nếu cậu sai ở đâu thì mình cùng nhìn thẳng vào chỗ đó; còn những thứ không phải trách nhiệm của cậu, mình không muốn cậu ôm luôn."
    ], state.turn)} `;
  } else if (need === "expression") {
    reply += `\n\n${pick([
      "Cứ kể tiếp đi, lộn xộn cũng được :)). Mình không cần cậu phải diễn đạt mọi thứ thật đẹp hay thật logic mới nghe được.",
      "Không biết nói sao cũng chẳng sao. Cậu cứ quăng từng mảnh suy nghĩ ra đây, mình cùng cậu xếp lại.",
      "Cậu không cần tìm đúng từ đâu. Nói theo kiểu cậu nghĩ trong đầu là được, mình sẽ theo mạch của cậu.",
      "Nếu trong đầu đang rối tung thì cứ nói đúng là 'mình đang rối'. Từ đó mình gỡ từng chút một cũng được."
    ], state.turn)} `;
  } else if (state.turn % 3 === 0) {
    reply += `\n\n${specificAdvice(topic)}`;
  }

  // Ask only when it meaningfully moves the conversation forward.
  const shouldAsk =
    first ||
    need === "clarity" ||
    need === "decision" ||
    state.turn % 2 === 0;

  if (shouldAsk) {
    reply += `\n\n${chooseQuestion(topic)}`;
  }

  return normalizeVietnamese(humanizeGenZ(reply, clean.length));
}


async function respond(text, first = false) {
  showTyping();
  const reply = makeReply(text, first);
  const delay = Math.min(1800, 700 + reply.length * 5);
  await new Promise(r => setTimeout(r, delay));
  hideTyping();
  addMessage("ai", reply);
}

async function startConversation(text) {
  state.started = true;
  state.turn = 0;
  state.usedPhrases = new Set();
  state.mood = null;
  state.profile = {
    topics: new Set(),
    needs: new Set(),
    patterns: new Set(),
    people: [],
    keyPhrases: [],
    lastEmotion: null
  };
  switchView(home, chat);
  messagesEl.innerHTML = "";
  addMessage("ai", "Mình ở đây để lắng nghe cậu.");
  await new Promise(r => setTimeout(r, 420));
  addMessage("user", text);
  await respond(text, true);
  chatInput.focus();
}

$("#startForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = normalizeVietnamese(startInput.value);
  if (!text) {
    startInput.focus();
    return;
  }
  startConversation(text);
});

$$(".quick-picks button").forEach(btn => {
  btn.addEventListener("click", () => startConversation(btn.dataset.starter));
});

$("#chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = normalizeVietnamese(chatInput.value);
  if (!text) return;
  chatInput.value = "";
  chatInput.style.height = "auto";
  addMessage("user", text);
  await respond(text);
});

[chatInput, startInput].forEach(input => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && input === chatInput) {
      e.preventDefault();
      $("#chatForm").requestSubmit();
    }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
  });
});

$("#backHome").addEventListener("click", () => switchView(chat, home));
$("#backChat").addEventListener("click", () => switchView(reflection, chat));

$("#reflectionBtn").addEventListener("click", () => {
  buildReflection();
  switchView(chat, reflection);
});

function buildReflection() {
  const userTexts = state.messages.filter(m => m.role === "user").map(m => m.text);
  const all = userTexts.join(" ");
  const mood = detectMood(all);
  const map = {
    sadness: {
      emotion: "Có vẻ cậu đang mang khá nhiều buồn, thất vọng hoặc cảm giác phải tự chịu đựng một mình.",
      trigger: "Một chuyện chạm vào nhu cầu được quan tâm, được công nhận hoặc được thấu hiểu.",
      thought: "“Có lẽ chuyện này nói lên điều gì đó về mình.”",
      need: "Được lắng nghe mà không bị phán xét, và có một khoảng an toàn để cảm xúc được hạ xuống."
    },
    anxiety: {
      emotion: "Lo lắng đang chiếm khá nhiều chỗ trong suy nghĩ của cậu.",
      trigger: "Sự không chắc chắn và những khả năng mà đầu óc đang liên tục dự đoán.",
      thought: "“Nếu điều tệ nhất xảy ra thì sao?”",
      need: "Cảm giác an toàn hơn và khả năng phân biệt điều đang xảy ra với điều mình đang dự đoán."
    },
    relationship: {
      emotion: "Cảm xúc của cậu đang gắn khá chặt với sự thay đổi trong một mối quan hệ.",
      trigger: "Khoảng cách hoặc cách một người quan trọng thay đổi cách đối xử với cậu.",
      thought: "“Mình có còn quan trọng với họ không?”",
      need: "Sự rõ ràng, kết nối và cảm giác rằng giá trị của mình không phụ thuộc hoàn toàn vào phản ứng của người khác."
    },
    angry: {
      emotion: "Bên ngoài là sự tức giận, nhưng phía dưới có thể còn có thất vọng, tổn thương hoặc bất lực.",
      trigger: "Một hành động khiến cậu cảm thấy mình không được tôn trọng hoặc không được hiểu.",
      thought: "“Tại sao họ lại có thể làm như vậy?”",
      need: "Được công nhận cảm xúc và có quyền đặt ranh giới."
    },
    academic: {
      emotion: "Thất vọng về kết quả đang kéo theo một phần nghi ngờ về chính mình.",
      trigger: "Khoảng cách giữa công sức cậu bỏ ra và kết quả cậu nhận được.",
      thought: "“Mình đã cố như vậy mà vẫn chưa đủ.”",
      need: "Được nhìn nhận công bằng cả nỗ lực lẫn những điều cần cải thiện."
    },
    breakup: {
      emotion: "Một sự thay đổi trong tình cảm đang chiếm khá nhiều chỗ trong lòng cậu.",
      trigger: "Khoảng cách, mất mát hoặc điều chưa được nói rõ trong mối quan hệ.",
      thought: "“Mình phải làm gì với những cảm xúc vẫn còn ở đây?”",
      need: "Được lắng nghe và có thời gian để hiểu điều mình thật sự cần."
    },
    friendship: {
      emotion: "Chuyện với một người bạn đang khiến cậu vừa tổn thương vừa băn khoăn.",
      trigger: "Cảm giác bị bỏ lại, không được tôn trọng hoặc tình bạn thay đổi.",
      thought: "“Tình bạn này còn có thể trở lại như trước không?”",
      need: "Sự rõ ràng, tôn trọng và một ranh giới phù hợp."
    },
    family: {
      emotion: "Chuyện gia đình đang chạm vào một phần rất riêng tư của cậu.",
      trigger: "Cảm giác không được hiểu, bị áp lực hoặc thiếu không gian để nói thật.",
      thought: "“Ước gì họ hiểu mình đang cố thế nào.”",
      need: "Được lắng nghe mà không phải giải thích hay biện minh cho mọi cảm xúc."
    },
    loneliness: {
      emotion: "Cậu đang có cảm giác thiếu một sự kết nối thật sự.",
      trigger: "Không có người bên cạnh, hoặc có người nhưng vẫn chưa cảm thấy được hiểu.",
      thought: "“Giá mà có một người thật sự hiểu mình.”",
      need: "Một kết nối an toàn và cảm giác mình không phải tự chịu mọi thứ một mình."
    },
    anger: {
      emotion: "Sự tức giận đang khá rõ, và phía dưới nó có thể là tổn thương hoặc bất lực.",
      trigger: "Một điều khiến cậu cảm thấy bị đối xử thiếu công bằng hoặc không được tôn trọng.",
      thought: "“Mình không đáng phải bị đối xử như vậy.”",
      need: "Được công nhận cảm xúc và có quyền đặt ranh giới."
    },
    unknown: {
      emotion: "Cảm xúc hiện tại chưa có một cái tên thật rõ — và điều đó hoàn toàn ổn.",
      trigger: "Có một điều đang lặp lại trong đầu cậu nhưng chưa được diễn đạt thành lời.",
      thought: "“Tại sao mình cứ nghĩ về chuyện này?”",
      need: "Một khoảng chậm lại để nhận ra điều gì thực sự quan trọng với mình."
    }
  };
  const data = map[mood] || map.unknown;
  const cards = [
    ["Điều cậu đang cảm thấy", data.emotion],
    ["Điều có thể đã kích hoạt nó", data.trigger],
    ["Một suy nghĩ đang xuất hiện", data.thought],
    ["Nhu cầu phía sau", data.need]
  ];
  $("#reflectionContent").innerHTML = cards.map(([label, value]) =>
    `<article class="ref-card"><div class="ref-label">${label}</div><div class="ref-text">${value}</div></article>`
  ).join("");
}

const dialog = $("#aboutDialog");
$("#aboutBtn").addEventListener("click", () => dialog.showModal());
$("#closeAbout").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});

// Final runtime guard: surface unexpected errors instead of silently breaking the UI.
window.addEventListener("error", (event) => {
  console.error("[Khoảng Lặng]", event.error || event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Khoảng Lặng]", event.reason);
});
