/* =========================
   기본 DOM
========================= */
const container = document.getElementById("dates");
const title = document.getElementById("title");

const goalPopup = document.getElementById("goal-popup");
const goalInput = document.getElementById("goal-input");
const goalSave = document.getElementById("goal-save");
const goalDisplay = document.getElementById("goal-display");
const goalDate = document.getElementById("goal-date");
const goalText = document.getElementById("goal-text");

const stagePopup = document.getElementById("stage-popup");
const stageTitle = document.getElementById("stage-title");
const stageFill = document.querySelector(".stage-progress-fill");
const stagePercent = document.getElementById("stage-percent");
const stageDots = document.querySelectorAll(".stage-dots span");
const stageSave = document.getElementById("stage-save");
const progressBar = document.querySelector(".stage-progress-bar");
const goalEdit = document.getElementById("goal-edit");

const journeyBar = document.querySelector(".journey-bar");
const journeyFill = document.querySelector(".journey-fill");
const journeyMarker = document.querySelector(".journey-marker");
const journeyEmoji = document.getElementById("journey-emoji");
/* =========================
   날짜 정보
========================= */
const now = new Date();
const today = now.getDate();
const month = now.getMonth();
const year = now.getFullYear();
const firstDay = new Date(year, month, 1).getDay();
let isRestoring = false;
const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

title.textContent = `${monthNames[month]} ${year}`;

/* =========================
   상태
========================= */
const points = [];
let selectedTargetDay = null;
let currentStageDay = null;
let currentPercent = 0;
let currentLevel = 0;

/* =========================
   날짜 생성
========================= */
const totalDays = new Date(year, month + 1, 0).getDate();

for (let d = 1; d <= totalDays; d++) {
    const el = document.createElement("div");
    el.className = "day";
    el.textContent = d;
    if (d === today) el.classList.add("today");

    el.onclick = () => {
        const hasGoal = !!localStorage.getItem("goal");

        // 목표 전 → 목표 선택
        if (!hasGoal && d >= today) {
            selectTarget(d, false);
            return;
        }

        // 목표 후 → 성취도 기록
        if (hasGoal && d >= today) {
            openStagePopup(d);
        }
    };

    container.appendChild(el);
    points.push({ day: d, el });
}

/* =========================
   day-dots 항상 생성
========================= */
createDayDots();

/* =========================
   초기 달력 레이아웃
========================= */
layoutAsCalendar();

function layoutAsCalendar() {
    const cell = 44, gap = 5, cols = 7;
    const width = container.clientWidth;
    const gridW = cols * cell + (cols - 1) * gap;
    const startX = (width - gridW) / 2;
    const startY = 140;

    points.forEach(p => {
        const index = firstDay + (p.day - 1);
        p.el.style.left = `${startX + (index % cols) * (cell + gap)}px`;
        p.el.style.top = `${startY + Math.floor(index / cols) * (cell + gap)}px`;
        p.el.style.transform = "scale(1)";
    });
}

/* =========================
   목표 선택 → 경로
========================= */
function selectTarget(targetDay, fromRestore = false) {
    selectedTargetDay = targetDay;

    points.forEach(p => {
        p.el.classList.remove("active", "target", "hidden");
        if (p.day < today || p.day > targetDay) {
            p.el.classList.add("hidden");
        }
    });

    const active = points.filter(p =>
        p.day >= today && p.day <= targetDay
    );

    active.forEach((p, i) => {
        p.el.classList.add("active");
        const t = i / (active.length - 1 || 1);
        p.el.style.transform = `scale(${0.9 + t * 0.25})`;
    });

    active.at(-1).el.classList.add("target");
    reorderVertically(active);

    if (!fromRestore) {
        setTimeout(() => {
            goalPopup.classList.remove("hidden");
            goalInput.focus();
        }, 500);
    }
}

/* =========================
   경로 배치
========================= */
function reorderVertically(arr) {
    let y = 80, x = 180;

    arr.forEach(p => {
        y += 80 + (Math.random() - 0.5) * 40;
        x += (Math.random() - 0.5) * 120;
        x = Math.max(60, Math.min(300, x));

        p.el.style.transition =
            "top .8s cubic-bezier(.4,0,.2,1), left .8s cubic-bezier(.4,0,.2,1)";
        p.el.style.left = `${x}px`;
        p.el.style.top = `${y}px`;
    });
}

/* =========================
   목표 저장
========================= */
goalSave.onclick = () => {
    const text = goalInput.value.trim();
    if (!text) return;

    const goal = { day: selectedTargetDay, text };
    localStorage.setItem("goal", JSON.stringify(goal));
    showGoal(goal);

    document.querySelectorAll(".day-dots").forEach(d => d.style.opacity = "1");

    goalPopup.classList.add("hidden");
    goalInput.value = "";
    showGoal(goal);

    // ✅ 진행 바 초기화 & 표시
    resetJourneyBar();
    journeyBar.style.display = "block";

    updateJourneyBar();

    updateJourneyLabels();


};

/* =========================
   목표 표시
========================= */
function showGoal(goal) {
    goalDate.textContent = `${month + 1}/${goal.day}`;
    goalText.textContent = goal.text;
    goalDisplay.classList.remove("hidden");
}

/* =========================
   새로고침 복원
========================= */
const savedGoal = localStorage.getItem("goal");

if (savedGoal) {
    isRestoring = true;

    const goal = JSON.parse(savedGoal);
    showGoal(goal);
    document.querySelectorAll(".day-dots").forEach(d => d.style.opacity = "1");

    setTimeout(() => {
        selectTarget(goal.day, true);
        restoreStageProgress();
        updateJourneyBar();
        isRestoring = false;
        updateJourneyLabels();
    }, 0);
}


/* =========================
   성취도 팝업
========================= */
function openStagePopup(day) {
    currentStageDay = day;
    currentPercent = 0;
    currentLevel = 0;

    stageTitle.textContent = "Today's Progress";
    updateStageUI();
    stagePopup.classList.remove("hidden");
}

/* =========================
   성취도 UI
========================= */
function updateStageUI() {
    const barW = progressBar.clientWidth;
    const knob = document.querySelector(".stage-progress-knob");
    const knobW = knob.offsetWidth || 14;

    // percent → px
    const x = (currentPercent / 100) * barW;

    // fill
    stageFill.style.width = `${x}px`;

    // knob (중심 기준)
    knob.style.left = `${x}px`;

    stagePercent.textContent = `${Math.round(currentPercent)}%`;

    if (currentPercent < 30) currentLevel = 0;
    else if (currentPercent < 60) currentLevel = 1;
    else if (currentPercent < 90) currentLevel = 2;
    else currentLevel = 3;

    stageDots.forEach((d, i) => {
        d.classList.toggle("filled", i < currentLevel);
    });
}


/* =========================
   성취도 드래그 (PC + 모바일)
========================= */
let dragging = false;

function updateProgress(clientX) {
    const rect = progressBar.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    currentPercent = Math.max(0, Math.min(100, ratio * 100));
    updateStageUI();
}

function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
}

progressBar.addEventListener("mousedown", e => {
    dragging = true;
    updateProgress(getClientX(e));
});

window.addEventListener("mousemove", e => {
    if (!dragging) return;
    updateProgress(getClientX(e));
});

window.addEventListener("mouseup", () => {
    dragging = false;
});

/* 모바일 */
progressBar.addEventListener("touchstart", e => {
    dragging = true;
    updateProgress(getClientX(e));
});

progressBar.addEventListener("touchmove", e => {
    if (!dragging) return;
    updateProgress(getClientX(e));
});

window.addEventListener("touchend", () => {
    dragging = false;
});

/* =========================
   성취도 저장
========================= */
stageSave.onclick = () => {
    const key = `${year}-${month + 1}-${currentStageDay}`;
    const data = JSON.parse(localStorage.getItem("stageProgress") || "{}");

    data[key] = { percent: currentPercent, level: currentLevel };
    localStorage.setItem("stageProgress", JSON.stringify(data));

    applyStageResult(currentStageDay, currentLevel);

    drawCurveBetweenDays(currentStageDay, currentStageDay + 1);

    stagePopup.classList.add("hidden");

    updateJourneyBar();

    const point = points.find(p => p.day === currentStageDay);
    if (point) {
        point.el.classList.remove("pulse");
        void point.el.offsetWidth;
        point.el.classList.add("pulse");
    }

};

/* =========================
   dots 반영
========================= */
function applyStageResult(day, level) {
    const point = points.find(p => p.day === day);
    if (!point) return;

    point.el.querySelectorAll(".day-dots span")
        .forEach((d, i) => d.classList.toggle("filled", i < level));
}

/* =========================
   dots 생성
========================= */
function createDayDots() {
    points.forEach(p => {
        const dots = document.createElement("div");
        dots.className = "day-dots";
        dots.innerHTML = "<span></span><span></span><span></span>";
        p.el.appendChild(dots);
    });
}


goalEdit.onclick = () => {
    const saved = localStorage.getItem("goal");
    if (!saved) return;

    const goal = JSON.parse(saved);

    // 기존 목표 텍스트 불러오기
    selectedTargetDay = goal.day;
    goalInput.value = goal.text;

    // 팝업 열기 (수정 모드)
    goalPopup.classList.remove("hidden");
    goalInput.focus();

    // 버튼 텍스트 바꾸고 싶으면 (선택)
    goalSave.textContent = "수정 완료";
};


const menuBtn = document.getElementById("menu-btn");
const menuPanel = document.getElementById("menu-panel");
const menuOverlay = document.getElementById("menu-overlay");
const addScheduleBtn = document.getElementById("add-schedule");
const menuCurrentGoal = document.getElementById("menu-current-goal");


function openMenu() {
    updateMenuCurrentGoal();

    menuOverlay.classList.remove("hidden");
    menuPanel.classList.remove("hidden");
    requestAnimationFrame(() => {
        menuPanel.classList.add("open");
    });
}


function closeMenu() {
    menuPanel.classList.remove("open");
    menuOverlay.classList.add("hidden");
    setTimeout(() => {
        menuPanel.classList.add("hidden");
    }, 300);
}

menuBtn.onclick = openMenu;
menuOverlay.onclick = closeMenu;

addScheduleBtn.onclick = () => {
    // 🔥 기존 목표 + 성취도 데이터 삭제
    localStorage.removeItem("goal");
    localStorage.removeItem("stageProgress");

    selectedTargetDay = null;
    currentStageDay = null;
    currentPercent = 0;
    currentLevel = 0;

    // 🔥 목표 UI 숨기기
    goalDisplay.classList.add("hidden");
    goalPopup.classList.add("hidden");
    goalInput.value = "";

    // 🔥 날짜 상태 완전 초기화
    points.forEach(p => {
        p.el.classList.remove("active", "target", "hidden");
        p.el.style.transform = "scale(1)";

        // 🔥 성취도 dots 초기화 (이게 핵심)
        p.el.querySelectorAll(".day-dots span").forEach(dot => {
            dot.classList.remove("filled");
        });
        resetJourneyBar();
        journeyBar.style.display = "none";
    });

    // 🔥 dots 자체 숨김
    document.querySelectorAll(".day-dots").forEach(d => {
        d.style.opacity = "0";
    });

    // 🔥 선 전부 제거
    const svg = document.getElementById("line-layer");
    if (svg) svg.innerHTML = "";

    // 🔥 달력 레이아웃 복귀
    layoutAsCalendar();

    closeMenu();
};



function updateMenuCurrentGoal() {
    const saved = localStorage.getItem("goal");

    if (saved) {
        const goal = JSON.parse(saved);
        menuCurrentGoal.textContent = `${month + 1}/${goal.day} · ${goal.text}`;
    } else {
        menuCurrentGoal.textContent = "아직 목표가 없습니다";
    }
}
updateMenuCurrentGoal();

function restoreGoalFromMenu() {
    const saved = localStorage.getItem("goal");
    if (!saved) return;

    const goal = JSON.parse(saved);

    // 기존 상태 초기화
    if (!isRestoring) {
        points.forEach(p => {
            p.el.classList.remove("active", "target", "hidden");
            p.el.style.transform = "scale(1)";
        });
    }

    // dots 보이기
    document.querySelectorAll(".day-dots").forEach(d => {
        d.style.opacity = "1";
    });

    // 목표 복원
    showGoal(goal);
    selectTarget(goal.day, true);

    closeMenu();
}

menuCurrentGoal.onclick = restoreGoalFromMenu;


function drawCurveBetweenDays(dayA, dayB) {
    const svg = document.getElementById("line-layer");

    // 이미 그려진 선이면 중단
    if (document.getElementById(`line-${dayA}-${dayB}`)) return;

    const p1 = points.find(p => p.day === dayA);
    const p2 = points.find(p => p.day === dayB);
    if (!p1 || !p2) return;

    const r1 = p1.el.getBoundingClientRect();
    const r2 = p2.el.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();

    const x1 = r1.left + r1.width / 2 - svgRect.left;
    const y1 = r1.top + r1.height / 2 - svgRect.top;
    const x2 = r2.left + r2.width / 2 - svgRect.left;
    const y2 = r2.top + r2.height / 2 - svgRect.top;

    const dx = x2 - x1;
    const dy = y2 - y1;

    const cx = x1 + dx * 0.8;
    const cy = y1 + dy * 0.5;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.id = `line-${dayA}-${dayB}`;

    path.setAttribute("d", `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
    path.setAttribute("stroke", "#cfcfcf");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-dasharray", "2 10");
    path.setAttribute("stroke-linecap", "round");

    svg.appendChild(path);
}

function restoreStageProgress() {
    const saved = JSON.parse(localStorage.getItem("stageProgress") || "{}");

    // ✅ 현재 달 데이터만 모으기
    const entries = Object.entries(saved)
        .map(([key, val]) => {
            const [y, m, d] = key.split("-").map(Number);
            return { y, m, d, val };
        })
        .filter(e => e.y === year && e.m === (month + 1) && Number.isFinite(e.d));

    if (!entries.length) return;

    // ✅ dots 보이게 (goal 있는 화면이면 어차피 1이지만, 안전하게)
    document.querySelectorAll(".day-dots").forEach(d => {
        d.style.opacity = "1";
    });

    // ✅ dots 복원
    entries.forEach(e => {
        applyStageResult(e.d, e.val.level ?? 0);
    });

    // ✅ 선 복원 (연속된 날만)
    const days = entries.map(e => e.d).sort((a, b) => a - b);

    // 새로고침 시 선 중복 방지: SVG 한번 비우고 다시 그리기
    const svg = document.getElementById("line-layer");
    if (svg) svg.innerHTML = "";

    for (let i = 0; i < days.length - 1; i++) {
        if (days[i + 1] === days[i] + 1) {
            drawCurveBetweenDays(days[i], days[i + 1]);
        }
    }
}


function updateJourneyBar() {
    const savedGoal = JSON.parse(localStorage.getItem("goal"));
    if (!savedGoal) return;

    const start = today;
    const end = savedGoal.day;
    if (end <= start) return;

    const progress = (today - start) / (end - start);
    const percent = Math.max(0, Math.min(1, progress)) * 100;

    document.querySelector(".journey-fill").style.width = `${percent}%`;
    document.querySelector(".journey-marker").style.left = `${percent}%`;

    updateJourneyEmoji();
}
function updateJourneyEmoji() {
    const key = `${year}-${month + 1}-${today}`;
    const data = JSON.parse(localStorage.getItem("stageProgress") || {});
    const level = data[key]?.level ?? 0;

    const emojiEl = document.getElementById("journey-emoji");

    if (level <= 1) emojiEl.textContent = "🐢";
    else if (level === 2) emojiEl.textContent = "🐰";
    else emojiEl.textContent = "🐎";
}

function resetJourneyBar() {
    journeyFill.style.width = "0%";
    journeyMarker.style.left = "0%";
    journeyEmoji.textContent = "🐢"; // 시작은 항상 거북이
}

if (savedGoal) {
    journeyBar.style.display = "block";

    setTimeout(() => {
        selectTarget(goal.day, true);
        restoreStageProgress();
        updateJourneyBar();
    }, 0);
} else {
    journeyBar.style.display = "none";
}

const weekdays = document.getElementById("weekdays");
weekdays.classList.add("hidden");
weekdays.classList.remove("hidden");

const journeyStart = document.getElementById("journey-start");
const journeyGoal = document.getElementById("journey-goal");

function updateJourneyLabels() {
    const savedGoal = JSON.parse(localStorage.getItem("goal"));
    if (!savedGoal) return;

    journeyStart.textContent = `${month + 1}/${today}`;
    journeyGoal.textContent = `${month + 1}/${savedGoal.day}`;
}
