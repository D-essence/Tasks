document.addEventListener('DOMContentLoaded', function() {
    // アプリケーションの状態
    const state = {
        currentPage: 'home',
        activities: [],
        currentActivity: null,
        dailyTasks: {},
        editMode: false,
        editingItem: null,
        userId: null,
        dataLoaded: false,
        currentTaskFilter: 'all'
    };

    const ASSIGNEES = {
        YU: 'yu',
        SAKI: 'saki',
        BOTH: 'both'
    };

    const ASSIGNEE_DISPLAY = {
        [ASSIGNEES.YU]: { badge: 'ゆちゃん', title: 'ゆちゃん' },
        [ASSIGNEES.SAKI]: { badge: 'さきたん', title: 'さきたん' },
        [ASSIGNEES.BOTH]: { badge: 'ゆちゃんorさきたん', title: 'ゆちゃんorさきたん' }
    };

    function normalizeAssignee(value) {
        if (!value) return ASSIGNEES.BOTH;

        const normalized = value.toString().trim().toLowerCase();
        if (['yu', 'ゆ', 'y', 'ゆちゃん', 'yuchan'].includes(normalized)) {
            return ASSIGNEES.YU;
        }
        if (['sa', 'さ', 's', 'さき', 'saki', 'さきたん', 'sakitan'].includes(normalized)) {
            return ASSIGNEES.SAKI;
        }
        if (['both', '両', 'りょう', 'ryo', 'ryou', 'all', 'どちらでも', 'ゆちゃんorさきたん'].includes(normalized)) {
            return ASSIGNEES.BOTH;
        }

        return Object.values(ASSIGNEES).includes(normalized) ? normalized : ASSIGNEES.BOTH;
    }

    function getAssigneeOptionsHTML(selectedValue = ASSIGNEES.BOTH) {
        return `
            <option value="${ASSIGNEES.YU}" ${selectedValue === ASSIGNEES.YU ? 'selected' : ''}>ゆちゃん</option>
            <option value="${ASSIGNEES.SAKI}" ${selectedValue === ASSIGNEES.SAKI ? 'selected' : ''}>さきたん</option>
            <option value="${ASSIGNEES.BOTH}" ${selectedValue === ASSIGNEES.BOTH ? 'selected' : ''}>ゆちゃんorさきたん</option>
        `;
    }

    function convertActivityDailyTasks(tasksArray) {
        if (!Array.isArray(tasksArray)) return [];

        return tasksArray.map(task => {
            if (typeof task === 'object' && task !== null) {
                return {
                    text: task.text || task.name || '',
                    assignee: normalizeAssignee(task.assignee)
                };
            }

            return {
                text: typeof task === 'string' ? task : '',
                assignee: ASSIGNEES.BOTH
            };
        }).filter(task => task.text);
    }

    function normalizeStoredDailyTask(task) {
        if (typeof task === 'object' && task !== null) {
            return {
                ...task,
                id: task.id || generateId(),
                name: task.name || task.text || '',
                completed: task.completed === true,
                isRecurring: task.isRecurring === true,
                assignee: normalizeAssignee(task.assignee)
            };
        }

        return {
            id: generateId(),
            name: typeof task === 'string' ? task : '',
            completed: false,
            isRecurring: false,
            assignee: ASSIGNEES.BOTH
        };
    }

    function normalizeDailyTasksObject(dailyTasksObj) {
        if (!dailyTasksObj || typeof dailyTasksObj !== 'object') return {};

        const normalized = {};
        Object.keys(dailyTasksObj).forEach(date => {
            const tasks = Array.isArray(dailyTasksObj[date]) ? dailyTasksObj[date] : [];
            normalized[date] = tasks.map(task => normalizeStoredDailyTask(task));
        });
        return normalized;
    }

    function sortTasksByCompletion(tasks) {
        if (!Array.isArray(tasks)) return [];

        return tasks.slice().sort((a, b) => {
            const aCompleted = a && a.completed ? 1 : 0;
            const bCompleted = b && b.completed ? 1 : 0;

            if (aCompleted === bCompleted) {
                return 0;
            }

            return aCompleted - bCompleted;
        });
    }

    function reorderTodayTasksInState() {
        const today = getCurrentDate();
        const todayTasks = state.dailyTasks[today];

        if (!Array.isArray(todayTasks)) {
            return false;
        }

        const temporaryTasks = sortTasksByCompletion(todayTasks.filter(task => !task.isRecurring));
        const recurringTasks = sortTasksByCompletion(todayTasks.filter(task => task.isRecurring));

        const reorderedTasks = [...temporaryTasks, ...recurringTasks];
        const changed = reorderedTasks.length !== todayTasks.length ||
            reorderedTasks.some((task, index) => task !== todayTasks[index]);

        if (changed) {
            state.dailyTasks[today] = reorderedTasks;
        }

        return changed;
    }

    function normalizeActivities() {
        state.activities = (state.activities || []).map(activity => {
            const updated = { ...activity };
            updated.kpis = convertKPIs(updated.kpis || []);
            updated.dailyTasks = convertActivityDailyTasks(updated.dailyTasks || []);
            initializeActivityStatus(updated);
            return updated;
        });

        state.dailyTasks = normalizeDailyTasksObject(state.dailyTasks || {});
    }

    function getRecurringTaskKey(activityId, taskName, assignee) {
        const normalizedName = (taskName || '').trim();
        const normalizedAssignee = normalizeAssignee(assignee);
        return `${activityId || ''}::${normalizedAssignee}::${normalizedName}`;
    }

    function getDefaultStatusFromTimeline(activity) {
        if (!activity) return 'short-term';
        const timeline = activity.timeline;
        if (timeline === 'long-term' || timeline === 'medium-term') {
            return 'long-term';
        }
        return 'short-term';
    }

    function initializeActivityStatus(activity) {
        if (!activity) return;

        if (typeof activity.statusManuallySet !== 'boolean') {
            activity.statusManuallySet = false;
        }

        if (!activity.status) {
            if (activity.completed || activity.progress >= 100) {
                activity.status = 'completed';
            } else if (activity.progress >= 20) {
                activity.status = 'in-progress';
            } else {
                activity.status = getDefaultStatusFromTimeline(activity);
            }
            activity.statusManuallySet = false;
        }

        syncStatusWithProgress(activity);
    }

    function syncStatusWithProgress(activity) {
        if (!activity) return;

        if (activity.completed || activity.progress >= 100) {
            activity.completed = true;
            activity.progress = Math.max(activity.progress || 0, 100);
            activity.status = 'completed';
            activity.statusManuallySet = false;
            return;
        }

        if (activity.progress >= 20) {
            if (activity.status !== 'in-progress' || activity.statusManuallySet) {
                activity.status = 'in-progress';
                activity.statusManuallySet = false;
            }
            return;
        }

        if (!activity.statusManuallySet && activity.status === 'completed') {
            activity.status = 'in-progress';
            activity.statusManuallySet = false;
            return;
        }

        if (!activity.status) {
            activity.status = getDefaultStatusFromTimeline(activity);
            activity.statusManuallySet = false;
            return;
        }

        if (!activity.statusManuallySet && activity.status === 'in-progress') {
            activity.status = getDefaultStatusFromTimeline(activity);
            activity.statusManuallySet = false;
        }
    }

    function getActivityStatus(activity) {
        if (!activity) return 'short-term';
        if (!activity.status) {
            initializeActivityStatus(activity);
        }
        return activity.status;
    }

    function promptForAssignee(defaultValue = ASSIGNEES.BOTH) {
        const defaultBadge = ASSIGNEE_DISPLAY[defaultValue]?.badge || 'ゆちゃんorさきたん';
        const input = prompt('担当を選択してください：ゆちゃん/さきたん/ゆちゃんorさきたん', defaultBadge);
        if (input === null) {
            return null;
        }
        return normalizeAssignee(input);
    }

    function setupFirestoreSubscription() {
        try {
            if (typeof subscribeData === "function" && state.userId) {
                const DEVICE_ID_KEY = "be-trillion-device-id";
                const __deviceId = localStorage.getItem(DEVICE_ID_KEY) || "";
                let __localMeta = state._meta || null;

                window.__unsubscribeFirestore && window.__unsubscribeFirestore();
                window.__unsubscribeFirestore = subscribeData(state.userId, (data) => {
                    if (!data) return;
                    const remoteMeta = (data && data._meta) || null;

                    if (remoteMeta && remoteMeta.deviceId && remoteMeta.deviceId === __deviceId) {
                        state._meta = remoteMeta;
                        return;
                    }

                    const isNewer = !__localMeta || (remoteMeta && remoteMeta.updatedAt > __localMeta.updatedAt);
                    if (!isNewer) return;

                    state.activities = data.activities || [];
                    state.dailyTasks = data.dailyTasks || {};
                    state._meta      = remoteMeta || null;
                    __localMeta      = state._meta;

                    if (typeof renderHomePage === 'function') {
                        renderHomePage();
                    } else if (typeof renderPage === "function") {
                        renderPage(state.currentPage || "home");
                    }
                    if (typeof updateLastUpdated === "function") updateLastUpdated();
                });
            }
        } catch (e) {
            console.error("subscribeData error:", e);
        }
    }

    window.onUserLogin = async function(uid) {
        state.userId = uid;
        await loadDataFromFirestore();
        setupFirestoreSubscription();
        renderPage(state.currentPage);
    };

    window.onUserLogout = function() {
        state.userId = null;
        window.__unsubscribeFirestore && window.__unsubscribeFirestore();
        state.activities = [];
        state.dailyTasks = {};
        state._meta = null;
        state.dataLoaded = false;
        renderPage('home');
    };

    // アプリの初期化
    initApp();

    // 現在の日付を設定
    updateCurrentDate();

    if (window.__currentUser) {
        window.onUserLogin(window.__currentUser.uid);
    } else {
        window.onUserLogout();
    }

    // =====================
    // データ管理機能
    // =====================

    // Firestoreからデータをロード
    async function loadDataFromFirestore() {
        if (!state.userId) {
            const initialData = initializeData();
            state.activities = initialData.activities;
            state.dailyTasks = initialData.dailyTasks;
            normalizeActivities();
            state.dataLoaded = false;
            return;
        }
        try {
            const data = await loadData(state.userId); // ← index.htmlで定義済みの関数を呼ぶ
            state.activities = data.activities || [];
            state.dailyTasks = data.dailyTasks || {};
            normalizeActivities();
            state.dataLoaded = true;

            // isRecurringフラグがない古いタスクに対してフラグを追加
            const today = getCurrentDate();
            if (state.dailyTasks[today]) {
                let requiresSave = false;
                state.dailyTasks[today].forEach(task => {
                    if (task.isRecurring === undefined) {
                        task.isRecurring = true;
                        requiresSave = true;
                    }
                });

                if (requiresSave) {
                    await saveDataToFirestore();
                }
            }
        } catch (error) {
            console.error('データのロード中にエラーが発生しました:', error);
            const initialData = initializeData();
            state.activities = initialData.activities;
            state.dailyTasks = initialData.dailyTasks;
            normalizeActivities();
            state.dataLoaded = false;
        }
    }

    // Firestoreにデータを保存
    async function saveDataToFirestore() {
        if (!state.userId || !state.dataLoaded) return;
        try {
            const __meta = await saveData(state.userId, { activities: state.activities, dailyTasks: state.dailyTasks });
            state._meta = __meta || null;
            updateLastUpdated();
        } catch (error) {
            console.error('データの保存中にエラーが発生しました:', error);
            alert('データの保存に失敗しました。');
        }
    }

    // 未来の日付を取得する関数（n日後）
    function getFutureDateString(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    // データを初期化する関数
    function initializeData() {
        // 初期データは空で返す
        return {
            activities: [],
            dailyTasks: {}
        };
    }

    // 一意のIDを生成する関数
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // アクティビティのIDから詳細を取得
    function getActivityById(id) {
        return state.activities.find(activity => activity.id === id);
    }

    // 現在の日付を取得
    function getCurrentDate() {
        const formatter = new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        const parts = formatter.formatToParts(new Date());
        const year = parts.find(part => part.type === 'year')?.value || '0000';
        const month = parts.find(part => part.type === 'month')?.value || '00';
        const day = parts.find(part => part.type === 'day')?.value || '00';

        return `${year}-${month}-${day}`;
    }

    // 現在の日付の表示を更新
    function updateCurrentDate() {
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Tokyo' };
        const formattedDate = new Intl.DateTimeFormat('ja-JP', options).format(new Date());

        // 今日のタスクページの日付を更新
        const currentDateElement = document.getElementById('current-date');
        if (currentDateElement) {
            currentDateElement.textContent = formattedDate;
        }
    }

    // 最終更新日時を更新
    function updateLastUpdated() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Tokyo'
        };
        const formattedDate = now.toLocaleDateString('ja-JP', options);

        // 各ページの更新日時を更新
        const lastUpdatedElements = document.querySelectorAll(
            '#last-updated-date, #footer-last-updated, #detail-last-updated, #detail-footer-last-updated, #tasks-footer-last-updated, #kpi-footer-last-updated'
        );
        lastUpdatedElements.forEach(element => {
            if (element) {
                element.textContent = formattedDate;
            }
        });
    }

    // =====================
    // 既存コードの「保存」呼び出し部分を全部
    // saveDataToFirestore() に書き換えてください
    // =====================

    // =====================
    // UIレンダリング機能
    // =====================
    
    // アプリを初期化する関数
    function initApp() {
        // KPIのフォーマットを確認し、必要に応じて変換
        migrateKPIFormat();
        
        // 編集・削除ボタンを非表示にするためのスタイルを追加
        const style = document.createElement('style');
        style.textContent = `
            .detail-item-edit-btn, .detail-item-delete-btn { 
                display: none !important; 
            }
        `;
        document.head.appendChild(style);
        
        // KPI一覧用のスタイルを追加
        addKpiListStyles();
        
        renderPage(state.currentPage);
        setupEventListeners();
        
        // URLのハッシュをチェックしてスクロール
        setTimeout(checkUrlHashAndScroll, 500);
        
        // ヘルプトーストは表示しない
    }
    
    // URLハッシュを確認してスクロールする関数
    function checkUrlHashAndScroll() {
        if (window.location.hash) {
            const id = window.location.hash.substring(1);
            const element = document.getElementById(id);
            if (element && state.currentPage === 'home') {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // ナビゲーションのアクティブ状態を更新
                const navLinks = document.querySelectorAll('.nav-link');
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.dataset.page === id);
                });
            }
        }
    }
    
    // ヘルプトースト表示関数
    function showHelperToast(message, duration = 5000) {
        // 完全に非表示にするため、関数は空にしておく
    }
    
    // KPIのフォーマットを変換する関数
    function convertKPIs(kpisArray) {
        if (!Array.isArray(kpisArray)) {
            return [];
        }

        return kpisArray.map(kpi => {
            // すでにオブジェクト形式の場合は completed フラグを確認
            if (typeof kpi === 'object' && kpi !== null) {
                return {
                    ...kpi,
                    text: kpi.text || '',
                    deadline: kpi.deadline || getFutureDateString(10),
                    completed: kpi.completed === true,
                    assignee: normalizeAssignee(kpi.assignee)
                };
            }

            // 文字列の場合はオブジェクトに変換
            return {
                text: kpi,
                deadline: getFutureDateString(10),
                completed: false,
                assignee: ASSIGNEES.BOTH
            };
        });
    }
    
    // KPIデータを新しいフォーマットに変換する関数
    function migrateKPIFormat() {
        let needsMigration = false;
        
        state.activities.forEach(activity => {
            if (!activity.completed) {
                activity.completed = activity.progress >= 100;
            }
            
            // KPIが文字列の配列の場合、またはcompletedフラグがない場合、オブジェクトの配列に変換
            let needsKpiMigration = false;
            if (Array.isArray(activity.kpis) && activity.kpis.length > 0) {
                if (typeof activity.kpis[0] === 'string') {
                    needsKpiMigration = true;
                } else if (typeof activity.kpis[0] === 'object' && activity.kpis[0] !== null && activity.kpis[0].completed === undefined) {
                    needsKpiMigration = true;
                }
            }
            
            if (needsKpiMigration) {
                activity.kpis = convertKPIs(activity.kpis);
                needsMigration = true;
            }
        });
        
        if (needsMigration) {
            saveDataToFirestore();
        }
    }

    // ページをレンダリングする関数
    function renderPage(page) {
        state.currentPage = page;
        const appContainer = document.getElementById('app');
        appContainer.innerHTML = '';
        
        let template;

        try {
            switch (page) {
                case 'home':
                    template = document.getElementById('home-template');
                    appContainer.appendChild(document.importNode(template.content, true));
                    renderHomeData();
                    break;
                case 'activity-detail':
                    template = document.getElementById('activity-detail-template');
                    appContainer.appendChild(document.importNode(template.content, true));
                    renderActivityDetail();
                    break;
                case 'daily-tasks':
                    template = document.getElementById('daily-tasks-template');
                    appContainer.appendChild(document.importNode(template.content, true));
                    renderDailyTasks();
                    break;
                case 'kpi-list':
                    template = document.getElementById('kpi-list-template');
                    appContainer.appendChild(document.importNode(template.content, true));
                    renderKpiList();
                    break;
                case 'activity-form':
                    template = document.getElementById('activity-form-template');
                    appContainer.appendChild(document.importNode(template.content, true));
                    setupFormEventListeners();
                    if (state.editMode && state.currentActivity) {
                        document.getElementById('form-title').textContent = '事業詳細編集';
                        fillActivityForm();
                    }
                    break;
                default:
                    template = document.getElementById('home-template');
                    appContainer.appendChild(document.importNode(template.content, true));
                    renderHomeData();
                    break;
            }
        } catch (error) {
            console.error('ページのレンダリング中にエラーが発生しました:', error);
            template = document.getElementById('home-template');
            appContainer.appendChild(document.importNode(template.content, true));
            renderHomeData();
            state.currentPage = 'home';
        } finally {
            // メインのナビゲーションにイベントリスナーを設定
            setupNavigationListeners();
            if (typeof initAccountMenu === 'function') {
                initAccountMenu();
            }
        }
    }

    // ホーム画面のデータをレンダリングする関数
    function renderHomeData() {
        updateLastUpdated();
        
        state.activities.forEach(initializeActivityStatus);

        const shortTermActivities = state.activities.filter(a => !a.completed && getActivityStatus(a) === 'short-term');
        const longTermActivities = state.activities.filter(a => !a.completed && getActivityStatus(a) === 'long-term');
        const inProgressActivities = state.activities.filter(a => !a.completed && getActivityStatus(a) === 'in-progress');
        const completedActivities = state.activities.filter(a => a.completed || getActivityStatus(a) === 'completed');
        
        // 事業数のカウントを更新
        document.getElementById('short-term-count').textContent = shortTermActivities.length;
        document.getElementById('long-term-count').textContent = longTermActivities.length;
        document.getElementById('in-progress-count').textContent = inProgressActivities.length;
        document.getElementById('completed-count').textContent = completedActivities.length;
        document.getElementById('total-count').textContent = state.activities.length;
        
        // 各カテゴリごとに事業カードをレンダリング
        renderActivityCards('short-term-cards', shortTermActivities, 'short-term');
        renderActivityCards('long-term-cards', longTermActivities, 'long-term');
        renderActivityCards('in-progress-cards', inProgressActivities, 'in-progress');
        renderActivityCards('completed-cards', completedActivities, 'completed');
        
        // 新規事業追加ボタンのイベントリスナーを設定
        document.getElementById('add-activity-btn').addEventListener('click', () => {
            state.editMode = false;
            state.currentActivity = null;
            renderPage('activity-form');
        });
    }

    // 活動カードをレンダリングする関数
    function renderActivityCards(containerId, activities, cardClass) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        activities.forEach(activity => {
            const card = document.createElement('div');
            card.className = `activity-card ${cardClass}`;
            card.dataset.id = activity.id;
            card.dataset.timeline = activity.timeline;
            card.dataset.status = getActivityStatus(activity);
            card.dataset.completed = activity.completed.toString();
            card.draggable = true;
            
            card.innerHTML = `
                <h4 class="activity-name">${activity.name}</h4>
                <div class="activity-progress">
                    <div class="activity-progress-wrapper">
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${activity.progress}%"></div>
                        </div>
                        <div class="progress-percentage">${activity.progress}%</div>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
            
            // カードクリックイベントを設定
            card.addEventListener('click', (e) => {
                // ドラッグ中はクリックイベントを発火させない
                if (!card.classList.contains('dragging')) {
                    state.currentActivity = activity.id;
                    renderPage('activity-detail');
                }
            });
            
            // ドラッグ関連のイベントリスナーを設定
            setupDragListeners(card);
        });
        
        // コンテナのドロップイベントリスナーを設定
        setupDropZone(container, cardClass);
    }
    
    // ドラッグ関連のイベントリスナーを設定する関数
    function setupDragListeners(card) {
        card.addEventListener('dragstart', function(e) {
            this.classList.add('dragging');
            e.dataTransfer.setData('text/plain', this.dataset.id);
            e.dataTransfer.setData('application/json', JSON.stringify({
                id: this.dataset.id,
                timeline: this.dataset.timeline,
                status: this.dataset.status,
                completed: this.dataset.completed
            }));
        });

        card.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
    }

    function getDragAfterElement(container, y) {
        const cards = [...container.querySelectorAll('.activity-card:not(.dragging)')];

        return cards.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }

            return closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }

    function updateActivityOrderFromDOM() {
        const containers = [
            'short-term-cards',
            'long-term-cards',
            'in-progress-cards',
            'completed-cards'
        ];

        const orderedIds = [];
        containers.forEach(id => {
            const column = document.getElementById(id);
            if (!column) return;
            column.querySelectorAll('.activity-card').forEach(card => {
                orderedIds.push(card.dataset.id);
            });
        });

        if (orderedIds.length === 0) {
            return false;
        }

        const activityMap = new Map(state.activities.map(activity => [activity.id, activity]));
        const newOrder = orderedIds
            .map(id => activityMap.get(id))
            .filter(activity => activity);

        if (newOrder.length === 0) {
            return false;
        }

        const remainingActivities = state.activities.filter(activity => !orderedIds.includes(activity.id));
        const updatedOrder = [...newOrder, ...remainingActivities];

        const changed = updatedOrder.some((activity, index) => activity.id !== state.activities[index]?.id);

        if (changed) {
            state.activities = updatedOrder;
        }

        return changed;
    }

    // ドロップゾーンのイベントリスナーを設定する関数
    function setupDropZone(container, zoneClass) {
        container.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');

            const draggingCard = document.querySelector('.activity-card.dragging');
            if (!draggingCard) return;

            const afterElement = getDragAfterElement(this, e.clientY);
            if (!afterElement) {
                if (draggingCard.parentElement !== this || draggingCard.nextElementSibling) {
                    this.appendChild(draggingCard);
                }
            } else if (afterElement !== draggingCard) {
                this.insertBefore(draggingCard, afterElement);
            }
        });

        container.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });

        container.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');

            try {
                const payload = e.dataTransfer.getData('application/json');
                if (!payload) return;
                const data = JSON.parse(payload);
                const activityId = data.id;
                const sourceStatus = data.status;

                const activityIndex = state.activities.findIndex(a => a.id === activityId);
                if (activityIndex === -1) return;

                const activity = state.activities[activityIndex];
                let statusChanged = false;

                switch(zoneClass) {
                    case 'short-term':
                        activity.timeline = 'short-term';
                        if (activity.completed) {
                            activity.completed = false;
                        }
                        if (activity.status !== 'short-term') {
                            activity.status = 'short-term';
                            activity.statusManuallySet = true;
                            statusChanged = true;
                        }
                        break;
                    case 'long-term':
                        activity.timeline = 'long-term';
                        if (activity.completed) {
                            activity.completed = false;
                        }
                        if (activity.status !== 'long-term') {
                            activity.status = 'long-term';
                            activity.statusManuallySet = true;
                            statusChanged = true;
                        }
                        break;
                    case 'in-progress':
                        if (activity.completed) {
                            activity.completed = false;
                        }
                        if (activity.status !== 'in-progress') {
                            activity.status = 'in-progress';
                            activity.statusManuallySet = true;
                            statusChanged = true;
                        }
                        break;
                    case 'completed':
                        activity.completed = true;
                        activity.progress = Math.max(activity.progress || 0, 100);
                        activity.status = 'completed';
                        activity.statusManuallySet = false;
                        statusChanged = true;

                        removeCompletedActivityTasks(activity.id);
                        break;
                }

                if (zoneClass !== 'completed') {
                    syncStatusWithProgress(activity);
                }

                const orderChanged = updateActivityOrderFromDOM();

                if (statusChanged || orderChanged || sourceStatus !== activity.status) {
                    saveDataToFirestore();
                }

                renderPage('home');
            } catch (error) {
                console.error('ドロップ処理中にエラーが発生しました:', error);
            }
        });
    }

    // 完了した事業のタスクを今日のタスクから削除する関数
    function removeCompletedActivityTasks(activityId) {
        const today = getCurrentDate();
        if (state.dailyTasks[today]) {
            state.dailyTasks[today] = state.dailyTasks[today].filter(task => 
                task.activityId !== activityId
            );
                    saveDataToFirestore();
        }
    }

    // KPIの完了状態に基づいて進捗度を計算する関数
    function calculateProgressFromKPIs(activity) {
        if (!activity || !Array.isArray(activity.kpis) || activity.kpis.length === 0) {
            return activity.progress || 0; // KPIがなければ現在の進捗度を返す
        }

        const totalKPIs = activity.kpis.length;
        const completedKPIs = activity.kpis.filter(kpi =>
            typeof kpi === 'object' && kpi !== null && kpi.completed
        ).length;

        // 進捗率を計算して四捨五入
        const progress = Math.round((completedKPIs / totalKPIs) * 100);

        return progress;
    }

    function recalculateActivityProgress(activity) {
        if (!activity) return;

        const newProgress = calculateProgressFromKPIs(activity);
        if (Number.isNaN(newProgress)) return;

        activity.progress = newProgress;

        if (newProgress >= 100) {
            activity.completed = true;
            if (activity.id) {
                removeCompletedActivityTasks(activity.id);
            }
        } else {
            activity.completed = false;
        }

        syncStatusWithProgress(activity);
    }

    // KPIの残り時間を計算する関数
    function getTimeRemaining(deadlineDate) {
        const now = new Date();
        const deadline = new Date(deadlineDate);
        deadline.setHours(23, 59, 59, 999); // 終日設定
        
        const diffMs = deadline - now;
        
        if (diffMs <= 0) {
            return '期限切れ';
        }
        
        // 同じ日の場合は時間と分で表示
        if (now.getDate() === deadline.getDate() && 
            now.getMonth() === deadline.getMonth() && 
            now.getFullYear() === deadline.getFullYear()) {
            
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return `残り ${hours}時間 ${minutes}分`;
        }
        
        // それ以外は日数で表示
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return `残り ${days}日`;
    }

    // 活動詳細ページをレンダリングする関数
    function renderActivityDetail() {
        const activity = getActivityById(state.currentActivity);
        if (!activity) return;
        
        document.getElementById('detail-activity-name').textContent = activity.name;
        
        // 進捗バーを更新
        updateProgressDisplay(activity);
        
        // KPIリストをレンダリング
        const kpiList = document.getElementById('kpi-list');
        kpiList.innerHTML = '';
        
        activity.kpis.forEach((kpi, index) => {
            const kpiItem = document.createElement('div');
            kpiItem.className = 'detail-list-item';
            kpiItem.dataset.index = index;
            
            // KPIオブジェクトかどうかを確認
            const kpiText = typeof kpi === 'object' ? kpi.text : kpi;
            const kpiDeadline = typeof kpi === 'object' ? kpi.deadline : null;
            const isCompleted = typeof kpi === 'object' && kpi.completed;
            let deadlineHTML = '';
            if (kpiDeadline) {
                const timeRemaining = getTimeRemaining(kpiDeadline);
                deadlineHTML = `<div class="detail-item-deadline">${timeRemaining}</div>`;
            }

            // チェックボックスを追加
            const checkboxHTML = `
                <div class="kpi-checkbox-wrapper">
                    <input type="checkbox" class="kpi-checkbox" data-index="${index}" ${isCompleted ? 'checked' : ''}>
                </div>
            `;

            kpiItem.innerHTML = `
                <div class="detail-item-content ${isCompleted ? 'completed-kpi' : ''}">
                    <span class="detail-item-text">${kpiText}</span>
                </div>
                ${deadlineHTML}
                ${checkboxHTML}
                <div class="detail-item-actions">
                    <button class="detail-item-edit-btn" data-type="kpi" data-index="${index}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="detail-item-delete-btn" data-type="kpi" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            kpiList.appendChild(kpiItem);
            
            // KPIチェックボックスのイベントリスナーを追加
            const checkbox = kpiItem.querySelector('.kpi-checkbox');
            checkbox.addEventListener('change', () => {
                // KPIの完了状態を更新
                activity.kpis[index].completed = checkbox.checked;

                recalculateActivityProgress(activity);

                // UI更新
                const kpiTextElement = kpiItem.querySelector('.detail-item-content');
                kpiTextElement.classList.toggle('completed-kpi', checkbox.checked);
                
                // 進捗バーを更新
                updateProgressDisplay(activity);
                
                // データを保存
                    saveDataToFirestore();
            });
        });
        
        // フェーズリストをレンダリング
        const phasesList = document.getElementById('phases-list');
        phasesList.innerHTML = '';
        
        activity.phases.forEach((phase, index) => {
            const phaseItem = document.createElement('div');
            phaseItem.className = 'phase-item';
            phaseItem.dataset.index = index;
            
            phaseItem.innerHTML = `
                <div class="phase-marker">${index + 1}</div>
                <div class="phase-content">
                    <div class="phase-text">${phase}</div>
                    <div class="phase-actions">
                        <button class="detail-item-edit-btn" data-type="phase" data-index="${index}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="detail-item-delete-btn" data-type="phase" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            phasesList.appendChild(phaseItem);
        });
        
        // 毎日のタスクリストをレンダリング
        const tasksList = document.getElementById('daily-tasks-list');
        tasksList.innerHTML = '';
        
        if (activity.dailyTasks && activity.dailyTasks.length > 0) {
            activity.dailyTasks.forEach((task, index) => {
                const taskItem = document.createElement('div');
                taskItem.className = 'detail-list-item';
                taskItem.dataset.index = index;
                taskItem.dataset.assignee = normalizeAssignee(task.assignee);

                const taskText = typeof task === 'object' ? task.text : task;

                taskItem.innerHTML = `
                    <div class="detail-item-content">
                        <span class="detail-item-text">${taskText}</span>
                    </div>
                    <div class="detail-item-actions">
                        <button class="detail-item-edit-btn" data-type="task" data-index="${index}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="detail-item-delete-btn" data-type="task" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                tasksList.appendChild(taskItem);
            });
            
            // 削除ボタンのイベントリスナーを追加（※修正点：このパートを追加）
            tasksList.querySelectorAll('.detail-item-delete-btn').forEach(button => {
                button.style.display = 'flex'; // ボタンを表示
                button.addEventListener('click', (e) => {
                    const type = e.currentTarget.dataset.type;
                    const index = parseInt(e.currentTarget.dataset.index);
                    
                    if (type === 'task') {
                        // タスクを削除
                        const taskToRemove = activity.dailyTasks[index];
                        activity.dailyTasks.splice(index, 1);
                        
                        // 今日のタスクからも対応するタスクを削除
                        removeTaskFromToday(activity.id, taskToRemove);
                        
                        // データを保存
                    saveDataToFirestore();
                        
                        // 再レンダリング
                        renderActivityDetail();
                    }
                });
            });
        } else {
            // タスクがない場合のメッセージ
            tasksList.innerHTML = '<div class="empty-list-message">毎日のタスクはありません</div>';
        }
        
        // 備考欄を更新
        const notesEditor = document.getElementById('notes-editor');
        notesEditor.innerHTML = activity.notes || '';
        
        // 備考欄の保存ボタンのイベントリスナーを設定
        document.getElementById('save-notes-btn').addEventListener('click', () => {
            const notesContent = notesEditor.innerHTML;
            activity.notes = notesContent;
                    saveDataToFirestore();
            alert('備考が保存されました');
        });
        
        // 戻るボタンのイベントリスナーを設定
        document.querySelector('.back-button').addEventListener('click', () => {
            renderPage('home');
        });
        
        // 編集ボタンのイベントリスナーを設定
        document.getElementById('edit-activity-btn').addEventListener('click', () => {
            state.editMode = true;
            renderPage('activity-form');
        });

        const deleteButton = document.getElementById('delete-activity-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', async () => {
                const confirmed = confirm(`事業「${activity.name}」を削除しますか？\n関連するKPI・フェーズ・毎日のタスクも全て削除されます。`);
                if (!confirmed) {
                    return;
                }

                const deleted = deleteActivity(activity.id);
                if (deleted) {
                    state.currentActivity = null;
                    state.editMode = false;
                    await saveDataToFirestore();
                    alert('事業を削除しました。');
                    renderPage('home');
                }
            });
        }

        // KPI、フェーズ、タスクの追加ボタンのイベントリスナーを設定
        document.querySelector('.kpi-add-detail-btn').addEventListener('click', () => {
            addItemInDetail('kpi');
        });
        
        document.querySelector('.phase-add-detail-btn').addEventListener('click', () => {
            addItemInDetail('phase');
        });
        
        document.querySelector('.task-add-detail-btn').addEventListener('click', () => {
            addItemInDetail('task');
        });
        
        // 最終更新日時を更新
        updateLastUpdated();
    }

    // 今日のタスクから特定のタスクを削除する関数
    function removeTaskFromToday(activityId, taskToRemove) {
        const today = getCurrentDate();
        if (state.dailyTasks[today]) {
            const removeName = typeof taskToRemove === 'object' ? (taskToRemove.text || taskToRemove.name || '') : taskToRemove;
            const removeAssignee = typeof taskToRemove === 'object'
                ? normalizeAssignee(taskToRemove.assignee)
                : ASSIGNEES.BOTH;

            state.dailyTasks[today] = state.dailyTasks[today].filter(task => {
                if (task.activityId === activityId && task.isRecurring) {
                    const taskName = task.name || task.text || '';
                    const taskAssignee = normalizeAssignee(task.assignee);
                    if (taskName === removeName && taskAssignee === removeAssignee) {
                        return false;
                    }
                }
                return true;
            });
        }
    }

    function removeActivityFromAllDailyTasks(activityId) {
        if (!state.dailyTasks || typeof state.dailyTasks !== 'object') return;

        Object.keys(state.dailyTasks).forEach(date => {
            const tasks = state.dailyTasks[date];
            if (!Array.isArray(tasks)) return;

            const filteredTasks = tasks.filter(task => task.activityId !== activityId);
            if (filteredTasks.length !== tasks.length) {
                if (filteredTasks.length > 0) {
                    state.dailyTasks[date] = filteredTasks;
                } else {
                    delete state.dailyTasks[date];
                }
            }
        });
    }

    function deleteActivity(activityId) {
        const activityIndex = state.activities.findIndex(activity => activity.id === activityId);
        if (activityIndex === -1) {
            return false;
        }

        state.activities.splice(activityIndex, 1);
        removeActivityFromAllDailyTasks(activityId);
        return true;
    }

    // 進捗表示を更新する関数
    function updateProgressDisplay(activity) {
        const progressBar = document.getElementById('detail-progress-bar');
        const progressPercentage = document.getElementById('detail-progress-percentage');
        
        if (progressBar && progressPercentage) {
            progressBar.style.width = `${activity.progress}%`;
            progressPercentage.textContent = `${activity.progress}%`;
        }
    }

    // ダッシュボードをレンダリングする関数

    // KPI一覧ページをレンダリングする関数
    function renderKpiList() {
        updateCurrentDate();
        updateLastUpdated();
        normalizeActivities();

        // KPIの配列を作成
        const allKpis = [];
        
        // 各事業のKPIを抽出（完了済み事業のKPIは除外）
        state.activities.forEach(activity => {
            // 完了済み事業のKPIは除外
            if (activity.completed || activity.progress >= 100) {
                return;
            }
            
            if (Array.isArray(activity.kpis)) {
                activity.kpis.forEach(kpi => {
                    if (typeof kpi === 'object' && kpi !== null) {
                        allKpis.push({
                            id: generateId(), // 一意のIDを生成
                            activityId: activity.id,
                            activityName: activity.name,
                            text: kpi.text,
                            deadline: kpi.deadline,
                            completed: kpi.completed,
                            assignee: kpi.assignee
                        });
                    }
                });
            }
        });
        
        // 残り日数でソート（未完了のものを優先、次に残り日数の少ない順）
        allKpis.sort((a, b) => {
            // 完了済みとそうでないものを分ける
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            
            // どちらも未完了の場合は残り日数で比較
            if (!a.completed && !b.completed) {
                const daysRemainingA = calculateDaysRemaining(a.deadline);
                const daysRemainingB = calculateDaysRemaining(b.deadline);
                
                // 期限切れは上位に
                if (daysRemainingA < 0 && daysRemainingB >= 0) return -1;
                if (daysRemainingA >= 0 && daysRemainingB < 0) return 1;
                
                // 残り日数の少ない順
                return daysRemainingA - daysRemainingB;
            }
            
            // どちらも完了済みの場合は事業名でソート
            return a.activityName.localeCompare(b.activityName);
        });
        
        // KPI達成状況を更新
        const totalKpis = allKpis.length;
        const completedKpis = allKpis.filter(kpi => kpi.completed).length;
        const completionPercentage = totalKpis > 0 ? (completedKpis / totalKpis) * 100 : 0;
        
        // カウント更新
        document.getElementById('total-kpi-count').textContent = totalKpis;
        document.getElementById('kpi-completed-count').textContent = completedKpis;
        
        // 進捗バー更新
        const progressBar = document.getElementById('kpi-completion-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${completionPercentage}%`;
        }
        
        // 日付を更新
        const currentDateElement = document.getElementById('kpi-current-date');
        if (currentDateElement) {
            const today = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            currentDateElement.textContent = today.toLocaleDateString('ja-JP', options);
        }
        
        // KPI一覧コンテナを取得
        const kpiContainer = document.getElementById('kpi-list-container');
        kpiContainer.innerHTML = '';

        const assigneeOrder = [ASSIGNEES.YU, ASSIGNEES.SAKI, ASSIGNEES.BOTH];

        assigneeOrder.forEach(assigneeKey => {
            const section = document.createElement('div');
            section.className = 'kpi-assignee-section';
            section.innerHTML = `
                <h3 class="assignee-title">${ASSIGNEE_DISPLAY[assigneeKey].title}</h3>
            `;

            const gridContainer = document.createElement('div');
            gridContainer.className = 'kpi-grid';
            section.appendChild(gridContainer);

            const assigneeKpis = allKpis.filter(kpi => normalizeAssignee(kpi.assignee) === assigneeKey);

            if (assigneeKpis.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-list-message';
                emptyMessage.textContent = '該当するKPIはありません';
                gridContainer.appendChild(emptyMessage);
            } else {
                assigneeKpis.forEach(kpi => {
                    const kpiCard = createKpiCard(kpi);
                    gridContainer.appendChild(kpiCard);
                });
            }

            kpiContainer.appendChild(section);
        });

        // フィルターボタンのイベントリスナーを設定
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const filter = button.dataset.filter;
                filterKpis(filter);
            });
        });
        
        // フッターの更新日時を更新
        const footerLastUpdated = document.getElementById('kpi-footer-last-updated');
        if (footerLastUpdated) {
            const now = new Date();
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            footerLastUpdated.textContent = now.toLocaleDateString('ja-JP', options);
        }
    }

    // KPIカードを作成する関数
    function createKpiCard(kpi) {
        const card = document.createElement('div');
        card.className = `kpi-card ${kpi.completed ? 'kpi-completed' : ''}`;
        card.dataset.id = kpi.id;
        card.dataset.activityId = kpi.activityId;
        card.dataset.assignee = normalizeAssignee(kpi.assignee);

        // 残り日数を計算
        const daysRemaining = calculateDaysRemaining(kpi.deadline);
        let deadlineClass = '';
        let deadlineText = '';
        
        if (kpi.completed) {
            deadlineClass = 'deadline-completed';
            deadlineText = '達成済み';
        } else if (daysRemaining < 0) {
            deadlineClass = 'deadline-expired';
            deadlineText = `期限切れ (${Math.abs(daysRemaining)}日経過)`;
        } else if (daysRemaining === 0) {
            deadlineClass = 'deadline-today';
            deadlineText = '本日期限';
        } else if (daysRemaining <= 3) {
            deadlineClass = 'deadline-urgent';
            deadlineText = `残り ${daysRemaining} 日`;
        } else if (daysRemaining <= 7) {
            deadlineClass = 'deadline-warning';
            deadlineText = `残り ${daysRemaining} 日`;
        } else {
            deadlineClass = 'deadline-normal';
            deadlineText = `残り ${daysRemaining} 日`;
        }
        
        // 日付フォーマット
        const deadlineDate = new Date(kpi.deadline);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        const formattedDate = deadlineDate.toLocaleDateString('ja-JP', options);

        card.innerHTML = `
            <div class="kpi-card-content">
                <div class="kpi-checkbox-container">
                    <input type="checkbox" class="kpi-checkbox" ${kpi.completed ? 'checked' : ''}>
                </div>
                <div class="kpi-info">
                    <div class="kpi-text ${kpi.completed ? 'completed-text' : ''}">${kpi.text}</div>
                    <div class="kpi-activity">${kpi.activityName}</div>
                </div>
                <div class="kpi-deadline-container">
                    <div class="kpi-deadline ${deadlineClass}">${deadlineText}</div>
                    <div class="kpi-date">${formattedDate}</div>
                </div>
            </div>
        `;
        
        // チェックボックスのイベントリスナーを設定
        const checkbox = card.querySelector('.kpi-checkbox');
        checkbox.addEventListener('change', () => {
            toggleKpiCompletion(kpi.activityId, kpi.text, checkbox.checked);
            card.classList.toggle('kpi-completed', checkbox.checked);
            card.querySelector('.kpi-text').classList.toggle('completed-text', checkbox.checked);
            
            // 達成状況を更新
            updateKpiCompletionStats();
            
            // もしこのKPIの完了によって事業が完了した場合（進捗度が100%になった場合）、
            // このKPIカードを非表示にする
            const activity = getActivityById(kpi.activityId);
            if (activity && (activity.progress >= 100 || activity.completed)) {
                card.remove();
            }
        });
        
        // カードクリックで詳細ページへ遷移（チェックボックス以外をクリックした場合）
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('kpi-checkbox')) {
                state.currentActivity = kpi.activityId;
                renderPage('activity-detail');
            }
        });
        
        return card;
    }

    // KPI達成状況統計を更新する関数
    function updateKpiCompletionStats() {
        const kpiCards = document.querySelectorAll('.kpi-card');
        const totalKpis = kpiCards.length;
        const completedKpis = document.querySelectorAll('.kpi-card.kpi-completed').length;
        const completionPercentage = totalKpis > 0 ? (completedKpis / totalKpis) * 100 : 0;
        
        // カウント更新
        document.getElementById('total-kpi-count').textContent = totalKpis;
        document.getElementById('kpi-completed-count').textContent = completedKpis;
        
        // 進捗バー更新
        const progressBar = document.getElementById('kpi-completion-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${completionPercentage}%`;
        }
    }

    // KPIフィルタリング関数
    function filterKpis(filter) {
        const kpiCards = document.querySelectorAll('.kpi-card');
        
        kpiCards.forEach(card => {
            switch (filter) {
                case 'completed':
                    card.style.display = card.classList.contains('kpi-completed') ? 'block' : 'none';
                    break;
                case 'pending':
                    card.style.display = !card.classList.contains('kpi-completed') ? 'block' : 'none';
                    break;
                default:
                    card.style.display = 'block';
                    break;
            }
        });
    }

    // KPI完了状態を切り替える関数
    function toggleKpiCompletion(activityId, kpiText, isCompleted) {
        const activity = getActivityById(activityId);
        if (!activity || !Array.isArray(activity.kpis)) return;
        
        // KPIを検索
        const kpiIndex = activity.kpis.findIndex(kpi => 
            typeof kpi === 'object' && kpi !== null && kpi.text === kpiText
        );
        
        if (kpiIndex !== -1) {
            // KPIの完了状態を更新
            activity.kpis[kpiIndex].completed = isCompleted;

            recalculateActivityProgress(activity);

            // データを保存
                saveDataToFirestore();
        }
    }

    // 残り日数を計算する関数
    function calculateDaysRemaining(deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const deadlineDate = new Date(deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    // KPI一覧ページ用のスタイルを追加する関数
    function addKpiListStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 1rem;
                width: 100%;
            }
            
            .kpi-card {
                background-color: white;
                border: 1px solid var(--border-color);
                border-radius: var(--card-radius);
                padding: 1rem;
                box-shadow: var(--shadow);
                cursor: pointer;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
            }
            
            .kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .kpi-card.kpi-completed {
                background-color: #f8f9fa;
                border-left: 4px solid var(--success-color);
            }
            
            .kpi-card-content {
                display: flex;
                align-items: flex-start;
            }
            
            .kpi-checkbox-container {
                margin-right: 0.8rem;
            }
            
            .kpi-checkbox {
                width: 20px;
                height: 20px;
                accent-color: var(--accent-color);
                cursor: pointer;
            }
            
            .kpi-info {
                flex: 1;
            }
            
            .kpi-text {
                font-size: 1rem;
                font-weight: 500;
                margin-bottom: 0.3rem;
            }
            
            .completed-text {
                text-decoration: line-through;
                color: var(--text-secondary);
            }
            
            .kpi-activity {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }
            
            .kpi-deadline-container {
                text-align: right;
                min-width: 100px;
                margin-left: 0.5rem;
            }
            
            .kpi-deadline {
                font-size: 0.85rem;
                font-weight: 500;
                padding: 0.2rem 0.6rem;
                border-radius: 12px;
                display: inline-block;
                margin-bottom: 0.3rem;
            }
            
            .kpi-date {
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .deadline-completed {
                background-color: var(--success-color);
                color: white;
            }
            
            .deadline-expired {
                background-color: var(--danger-color);
                color: white;
            }
            
            .deadline-today {
                background-color: var(--danger-color);
                color: white;
            }
            
            .deadline-urgent {
                background-color: var(--warning-color);
                color: var(--text-color);
            }
            
            .deadline-warning {
                background-color: #f39c12;
                color: white;
            }
            
            .deadline-normal {
                background-color: var(--accent-light);
                color: var(--accent-color);
            }
        `;
        document.head.appendChild(style);
    }

    // 今日のタスク一覧ページをレンダリングする関数
    function renderDailyTasks() {
        updateCurrentDate();
        updateLastUpdated();
        normalizeActivities();

        const today = getCurrentDate();
        const tasksContainer = document.getElementById('daily-tasks-container');
        tasksContainer.innerHTML = '';

        let tasksChanged = false;

        if (!state.dailyTasks[today]) {
            state.dailyTasks[today] = [];
            tasksChanged = true;
        }

        const todayTasks = state.dailyTasks[today];
        const temporaryTasks = todayTasks.filter(task => !task.isRecurring);
        const activeActivities = state.activities.filter(activity => !activity.completed);

        const requiredRecurringMap = new Map();
        activeActivities.forEach(activity => {
            (activity.dailyTasks || []).forEach(task => {
                const taskName = task.text || task.name || '';
                if (!taskName) return;
                const key = getRecurringTaskKey(activity.id, taskName, task.assignee);
                if (!requiredRecurringMap.has(key)) {
                    requiredRecurringMap.set(key, {
                        activityId: activity.id,
                        activityName: activity.name,
                        taskName,
                        assignee: normalizeAssignee(task.assignee)
                    });
                }
            });
        });

        const updatedRecurringTasks = [];
        const matchedKeys = new Set();

        todayTasks.forEach(task => {
            if (!task.isRecurring) {
                return;
            }

            const taskName = task.name || task.text || '';
            const key = getRecurringTaskKey(task.activityId, taskName, task.assignee);

            if (requiredRecurringMap.has(key) && !matchedKeys.has(key)) {
                const baseInfo = requiredRecurringMap.get(key);

                if (task.activityId !== baseInfo.activityId) {
                    task.activityId = baseInfo.activityId;
                    tasksChanged = true;
                }
                if (task.activityName !== baseInfo.activityName) {
                    task.activityName = baseInfo.activityName;
                    tasksChanged = true;
                }
                if ((task.name || '') !== baseInfo.taskName) {
                    task.name = baseInfo.taskName;
                    tasksChanged = true;
                }
                const normalizedAssignee = baseInfo.assignee;
                if (normalizeAssignee(task.assignee) !== normalizedAssignee) {
                    task.assignee = normalizedAssignee;
                    tasksChanged = true;
                }

                updatedRecurringTasks.push(task);
                matchedKeys.add(key);
            } else {
                tasksChanged = true;
            }
        });

        requiredRecurringMap.forEach((info, key) => {
            if (matchedKeys.has(key)) return;

            updatedRecurringTasks.push({
                id: generateId(),
                activityId: info.activityId,
                activityName: info.activityName,
                name: info.taskName,
                completed: false,
                isRecurring: true,
                assignee: info.assignee
            });
            tasksChanged = true;
        });

        const newTodayTasks = [...temporaryTasks, ...updatedRecurringTasks];
        const arraysDiffer = newTodayTasks.length !== todayTasks.length ||
            newTodayTasks.some((task, index) => task !== todayTasks[index]);

        if (arraysDiffer) {
            state.dailyTasks[today] = newTodayTasks;
            tasksChanged = true;
        }

        if (reorderTodayTasksInState()) {
            tasksChanged = true;
        }

        if (tasksChanged) {
            saveDataToFirestore();
        }

        const finalTodayTasks = state.dailyTasks[today];
        const recurringTasks = finalTodayTasks
            .filter(task => task.isRecurring)
            .slice()
            .sort((a, b) => {
                if (!!a.completed !== !!b.completed) {
                    return a.completed ? 1 : -1;
                }

                return (a.activityName || '').localeCompare(b.activityName || '');
            });
        const finalTemporaryTasks = finalTodayTasks.filter(task => !task.isRecurring);

        // 各グループをソート (活動名でソート)
        recurringTasks.sort((a, b) => (a.activityName || '').localeCompare(b.activityName || ''));

        // タスク追加セクションの表示
        const addTaskSection = document.createElement('div');
        addTaskSection.className = 'daily-task-add-section';
        addTaskSection.innerHTML = `
            <h3 class="daily-task-section-title">今日だけのタスクを追加</h3>
            <div class="task-add-form">
                <input type="text" id="new-temporary-task" placeholder="新しいタスクを入力..." class="task-add-input">
                <select id="new-temporary-task-assignee" class="task-assignee-select assignee-select">
                    ${getAssigneeOptionsHTML(ASSIGNEES.BOTH)}
                </select>
                <button id="add-temporary-task-btn" class="task-add-btn">
                    <i class="fas fa-plus"></i> 追加
                </button>
            </div>
        `;
        tasksContainer.appendChild(addTaskSection);

        const temporarySection = document.createElement('div');
        temporarySection.className = 'daily-task-section temporary-tasks';
        temporarySection.innerHTML = `
            <h3 class="daily-task-section-title">今日だけのタスク</h3>
        `;
        const temporaryWrapper = document.createElement('div');
        temporaryWrapper.className = 'assignee-sections';
        temporarySection.appendChild(temporaryWrapper);
        renderTaskAssigneeSections(temporaryWrapper, finalTemporaryTasks, 'temporary');
        tasksContainer.appendChild(temporarySection);

        const divider = document.createElement('div');
        divider.className = 'task-section-divider';
        tasksContainer.appendChild(divider);

        const recurringSection = document.createElement('div');
        recurringSection.className = 'daily-task-section recurring-tasks';
        recurringSection.innerHTML = `
            <h3 class="daily-task-section-title">事業の毎日のタスク</h3>
        `;
        const recurringWrapper = document.createElement('div');
        recurringWrapper.className = 'assignee-sections';
        recurringSection.appendChild(recurringWrapper);
        renderTaskAssigneeSections(recurringWrapper, recurringTasks, 'recurring');
        tasksContainer.appendChild(recurringSection);

        // 一時的なタスク追加ボタンのイベントリスナーを設定
        document.getElementById('add-temporary-task-btn').addEventListener('click', addTemporaryTask);

        // Enter キーでも追加できるようにする
        document.getElementById('new-temporary-task').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTemporaryTask();
            }
        });
        
        // タスク完了状況を更新
        updateTaskCompletion();
        
        // フィルターボタンのイベントリスナーを設定
        const filterButtons = document.querySelectorAll('.filter-btn');
        const activeFilter = state.currentTaskFilter || 'all';

        filterButtons.forEach(btn => btn.classList.remove('active'));

        filterButtons.forEach(button => {
            const filterValue = button.dataset.filter || 'all';

            if (filterValue === activeFilter) {
                button.classList.add('active');
            }

            button.addEventListener('click', () => {
                state.currentTaskFilter = filterValue;
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                filterTasks(filterValue);
            });
        });

        filterTasks(activeFilter);
    }
    
    // タスクリストをレンダリングする共通関数
    function renderTaskList(container, tasks) {
        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = `task-item ${task.completed ? 'task-completed' : ''}`;
            taskItem.dataset.id = task.id;
            taskItem.dataset.assignee = normalizeAssignee(task.assignee);

            const taskName = task.name || task.text || '';

            let activityInfo = '';
            if (task.activityName) {
                activityInfo = `<div class="task-activity">${task.activityName}</div>`;
            }

            taskItem.innerHTML = `
                <div class="task-checkbox-wrapper">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                </div>
                <div class="task-content">
                    <div class="task-header">
                        <div class="task-name">${taskName}</div>
                    </div>
                    ${activityInfo}
                </div>
                <button class="task-delete-btn" title="削除">
                    <i class="fas fa-trash"></i>
                </button>
            `;

            container.appendChild(taskItem);

            // チェックボックスのイベントリスナーを設定
            const checkbox = taskItem.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => {
                task.completed = checkbox.checked;
                taskItem.classList.toggle('task-completed', checkbox.checked);
                const orderChanged = reorderTodayTasksInState();
                updateTaskCompletion();
                    saveDataToFirestore();

                if (orderChanged) {
                    renderDailyTasks();
                } else {
                    filterTasks(state.currentTaskFilter || 'all');
                }
            });

            // 削除ボタンのイベントリスナーを設定
            const deleteBtn = taskItem.querySelector('.task-delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteTask(task.id);
                taskItem.remove();
                updateTaskCompletion();
            });
        });
    }

    function renderTaskAssigneeSections(wrapper, tasks, sectionClass) {
        wrapper.innerHTML = '';
        const order = [ASSIGNEES.YU, ASSIGNEES.SAKI, ASSIGNEES.BOTH];

        order.forEach(assigneeKey => {
            const section = document.createElement('div');
            section.className = `assignee-section ${sectionClass}-assignee-section`;
            section.innerHTML = `
                <h4 class="assignee-title">${ASSIGNEE_DISPLAY[assigneeKey].title}</h4>
                <div class="daily-task-list"></div>
            `;

            const list = section.querySelector('.daily-task-list');
            const assigneeTasks = tasks.filter(task => normalizeAssignee(task.assignee) === assigneeKey);

            if (assigneeTasks.length > 0) {
                renderTaskList(list, assigneeTasks);
            } else {
                list.innerHTML = '<div class="empty-task-message">タスクはありません</div>';
            }

            wrapper.appendChild(section);
        });
    }
    
    // 一時的なタスクを追加する関数
    function addTemporaryTask() {
        const taskInput = document.getElementById('new-temporary-task');
        const taskText = taskInput.value.trim();
        const assigneeSelect = document.getElementById('new-temporary-task-assignee');
        const assignee = assigneeSelect ? normalizeAssignee(assigneeSelect.value) : ASSIGNEES.BOTH;

        if (taskText) {
            const today = getCurrentDate();
            const newTask = {
                id: generateId(),
                name: taskText,
                completed: false,
                isRecurring: false,
                assignee
            };

            if (!state.dailyTasks[today]) {
                state.dailyTasks[today] = [];
            }

            state.dailyTasks[today].push(newTask);
                    saveDataToFirestore();

            // 入力フィールドをクリア
            taskInput.value = '';
            if (assigneeSelect) {
                assigneeSelect.value = ASSIGNEES.BOTH;
            }

            // 表示を更新
            renderDailyTasks();
        }
    }
    
    // タスクを削除する関数
    function deleteTask(taskId) {
        const today = getCurrentDate();
        if (state.dailyTasks[today]) {
            state.dailyTasks[today] = state.dailyTasks[today].filter(task => task.id !== taskId);
                    saveDataToFirestore();
        }
    }

    // タスク完了状況を更新する関数
    function updateTaskCompletion() {
        const today = getCurrentDate();
        const tasks = state.dailyTasks[today] || [];
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        // カウントを更新
        const totalTaskCountElem = document.getElementById('total-task-count');
        const taskCompletedCountElem = document.getElementById('task-completed-count');
        
        if (totalTaskCountElem) totalTaskCountElem.textContent = totalTasks;
        if (taskCompletedCountElem) taskCompletedCountElem.textContent = completedTasks;
        
        // 進捗バーを更新
        const progressBar = document.getElementById('completion-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${completionPercentage}%`;
        }
    }

    // タスクをフィルタリングする関数
    function filterTasks(filter) {
        const taskItems = document.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            switch (filter) {
                case 'completed':
                    item.style.display = item.classList.contains('task-completed') ? 'flex' : 'none';
                    break;
                case 'pending':
                    item.style.display = !item.classList.contains('task-completed') ? 'flex' : 'none';
                    break;
                default:
                    item.style.display = 'flex';
                    break;
            }
        });
    }

    // 詳細画面での項目追加関数
    function addItemInDetail(type) {
        const activity = getActivityById(state.currentActivity);
        if (!activity) return;
        
        let newItem;
        
        switch (type) {
            case 'kpi':
                // プロンプトダイアログでKPIのテキストを取得
                const kpiText = prompt('新しいKPIを入力してください:');
                if (!kpiText || kpiText.trim() === '') return;

                const kpiAssignee = promptForAssignee();
                if (kpiAssignee === null) return;

                // 日付選択UI表示（モーダルやプロンプトの代わりに日付入力ダイアログを使用）
                const dateInput = document.createElement('input');
                dateInput.type = 'date';
                dateInput.value = getFutureDateString(10);
                dateInput.style.position = 'absolute';
                dateInput.style.left = '-9999px'; // 画面外に配置
                document.body.appendChild(dateInput);
                
                dateInput.showPicker();
                
                // 日付選択後の処理
                dateInput.addEventListener('change', function() {
                    const selectedDate = this.value;
                    document.body.removeChild(this);

                    if (selectedDate && isValidDate(selectedDate)) {
                        newItem = { text: kpiText, deadline: selectedDate, completed: false, assignee: kpiAssignee };
                        activity.kpis.push(newItem);
                        recalculateActivityProgress(activity);
                        saveDataToFirestore();
                        renderActivityDetail();
                    }
                });
                
                // キャンセル用のイベント（5秒後にクリーンアップ）
                setTimeout(() => {
                    if (document.body.contains(dateInput)) {
                        document.body.removeChild(dateInput);
                    }
                }, 5000);
                
                return;
                
            case 'phase':
                const phaseText = prompt('新しいフェーズを入力してください:');
                if (!phaseText || phaseText.trim() === '') return;
                
                activity.phases.push(phaseText);
                break;
                
            case 'task':
                const taskText = prompt('新しいタスクを入力してください:');
                if (!taskText || taskText.trim() === '') return;

                const taskAssignee = promptForAssignee();
                if (taskAssignee === null) return;

                // 毎日のタスク配列が存在しない場合は作成
                if (!activity.dailyTasks) {
                    activity.dailyTasks = [];
                }

                activity.dailyTasks.push({ text: taskText, assignee: taskAssignee });

                // 今日のタスクにも追加
                if (taskText && !activity.completed) {
                    const today = getCurrentDate();
                    if (!state.dailyTasks[today]) {
                        state.dailyTasks[today] = [];
                    }

                    state.dailyTasks[today].push({
                        id: generateId(),
                        activityId: activity.id,
                        activityName: activity.name,
                        name: taskText,
                        completed: false,
                        isRecurring: true,
                        assignee: taskAssignee
                    });
                }
                break;
                
            default:
                return;
        }
        
                    saveDataToFirestore();
        renderActivityDetail();
    }
    
    // 日付の妥当性をチェックする関数
    function isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return false;
        
        return true;
    }
    
    // 活動フォームに値を入力する関数
    function fillActivityForm() {
        const activity = getActivityById(state.currentActivity);
        if (!activity) return;
        
        document.getElementById('activity-name').value = activity.name;
        const timelineField = document.getElementById('activity-timeline');
        if (timelineField) {
            timelineField.value = activity.timeline === 'short-term' ? 'short-term' : 'long-term';
        }
        document.getElementById('activity-progress').value = activity.progress;
        
        // KPIの入力フィールドを作成
        const kpiInputs = document.getElementById('kpi-inputs');
        kpiInputs.innerHTML = '';
        
        activity.kpis.forEach((kpi, index) => {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group kpi-input-group';

            // KPIがオブジェクトかどうかを確認
            const kpiText = typeof kpi === 'object' ? kpi.text : kpi;
            const kpiDeadline = typeof kpi === 'object' ? kpi.deadline : getFutureDateString(10);
            const kpiAssignee = typeof kpi === 'object' ? normalizeAssignee(kpi.assignee) : ASSIGNEES.BOTH;

            inputGroup.innerHTML = `
                <input type="text" class="kpi-input" placeholder="KPI" value="${kpiText}" required>
                <input type="date" class="kpi-date-input" value="${kpiDeadline}" required>
                <select class="kpi-assignee-select assignee-select">
                    ${getAssigneeOptionsHTML(kpiAssignee)}
                </select>
                ${index === 0 ?
                    `<button type="button" class="add-item-btn kpi-add-btn">
                        <i class="fas fa-plus"></i>
                    </button>` :
                    `<button type="button" class="remove-item-btn kpi-remove-btn">
                        <i class="fas fa-minus"></i>
                    </button>`
                }
            `;

            kpiInputs.appendChild(inputGroup);
        });
        
        // フェーズの入力フィールドを作成
        const phaseInputs = document.getElementById('phase-inputs');
        phaseInputs.innerHTML = '';
        
        activity.phases.forEach((phase, index) => {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group';
            
            inputGroup.innerHTML = `
                <input type="text" class="phase-input" placeholder="フェーズ" value="${phase}">
                ${index === 0 ? 
                    `<button type="button" class="add-item-btn phase-add-btn">
                        <i class="fas fa-plus"></i>
                    </button>` :
                    `<button type="button" class="remove-item-btn phase-remove-btn">
                        <i class="fas fa-minus"></i>
                    </button>`
                }
            `;
            
            phaseInputs.appendChild(inputGroup);
        });
        
        // 毎日のタスクの入力フィールドを作成
        const taskInputs = document.getElementById('task-inputs');
        taskInputs.innerHTML = '';
        
        if (activity.dailyTasks && activity.dailyTasks.length > 0) {
            activity.dailyTasks.forEach((task, index) => {
                const inputGroup = document.createElement('div');
                inputGroup.className = 'input-group task-input-group';

                const taskText = typeof task === 'object' ? task.text : task;
                const taskAssignee = typeof task === 'object' ? normalizeAssignee(task.assignee) : ASSIGNEES.BOTH;

                inputGroup.innerHTML = `
                    <input type="text" class="task-input" placeholder="タスク" value="${taskText}">
                    <select class="task-assignee-select assignee-select">
                        ${getAssigneeOptionsHTML(taskAssignee)}
                    </select>
                    ${index === 0 ?
                        `<button type="button" class="add-item-btn task-add-btn">
                            <i class="fas fa-plus"></i>
                        </button>` :
                        `<button type="button" class="remove-item-btn task-remove-btn">
                            <i class="fas fa-minus"></i>
                        </button>`
                    }
                `;

                taskInputs.appendChild(inputGroup);
            });
        } else {
            // タスクがない場合は空の入力フィールドを表示
            const inputGroup = document.createElement('div');
            inputGroup.className = 'input-group task-input-group';

            inputGroup.innerHTML = `
                <input type="text" class="task-input" placeholder="タスク">
                <select class="task-assignee-select assignee-select">
                    ${getAssigneeOptionsHTML(ASSIGNEES.BOTH)}
                </select>
                <button type="button" class="add-item-btn task-add-btn">
                    <i class="fas fa-plus"></i>
                </button>
            `;

            taskInputs.appendChild(inputGroup);
        }
        
        // 各入力フィールドの追加・削除ボタンにイベントリスナーを設定
        setupDynamicInputListeners();
    }

    // 活動フォームのイベントリスナーを設定する関数
    function setupFormEventListeners() {
        // 戻るボタンイベントを設定
        document.querySelector('.back-button').addEventListener('click', handleFormCancel);
        
        // キャンセルボタンイベントを設定
        document.querySelector('.cancel-btn').addEventListener('click', handleFormCancel);
        
        // フォーム送信イベントを設定
        document.getElementById('activity-form').addEventListener('submit', handleFormSubmit);
        
        // 動的な入力フィールドのイベントリスナーを設定
        setupDynamicInputListeners();
    }

    // 動的な入力フィールドのイベントリスナーを設定する関数
    function setupDynamicInputListeners() {
        // KPI追加ボタンイベントを設定
        document.querySelectorAll('.kpi-add-btn').forEach(button => {
            button.addEventListener('click', () => addInputField('kpi'));
        });
        
        // フェーズ追加ボタンイベントを設定
        document.querySelectorAll('.phase-add-btn').forEach(button => {
            button.addEventListener('click', () => addInputField('phase'));
        });
        
        // タスク追加ボタンイベントを設定
        document.querySelectorAll('.task-add-btn').forEach(button => {
            button.addEventListener('click', () => addInputField('task'));
        });
        
        // 削除ボタンイベントを設定
        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', function() {
                this.parentElement.remove();
            });
        });
    }

    // 動的な入力フィールドを追加する関数
    function addInputField(type) {
        const container = document.getElementById(`${type}-inputs`);
        const inputGroup = document.createElement('div');
        
        if (type === 'kpi') {
            inputGroup.className = 'input-group kpi-input-group';
            inputGroup.innerHTML = `
                <input type="text" class="kpi-input" placeholder="KPI" required>
                <input type="date" class="kpi-date-input" value="${getFutureDateString(10)}" required>
                <select class="kpi-assignee-select assignee-select">
                    ${getAssigneeOptionsHTML(ASSIGNEES.BOTH)}
                </select>
                <button type="button" class="remove-item-btn kpi-remove-btn">
                    <i class="fas fa-minus"></i>
                </button>
            `;
        } else if (type === 'task') {
            inputGroup.className = 'input-group task-input-group';
            inputGroup.innerHTML = `
                <input type="text" class="task-input" placeholder="タスク">
                <select class="task-assignee-select assignee-select">
                    ${getAssigneeOptionsHTML(ASSIGNEES.BOTH)}
                </select>
                <button type="button" class="remove-item-btn task-remove-btn">
                    <i class="fas fa-minus"></i>
                </button>
            `;
        } else {
            inputGroup.className = 'input-group';
            inputGroup.innerHTML = `
                <input type="text" class="${type}-input" placeholder="${type === 'phase' ? 'フェーズ' : 'タスク'}">
                <button type="button" class="remove-item-btn ${type}-remove-btn">
                    <i class="fas fa-minus"></i>
                </button>
            `;
        }
        
        container.appendChild(inputGroup);
        
        // 削除ボタンイベントを設定
        inputGroup.querySelector('.remove-item-btn').addEventListener('click', function() {
            this.parentElement.remove();
        });
        
        // 追加したフィールドにフォーカスを当てる
        inputGroup.querySelector('input').focus();
    }

    // フォームキャンセル処理
    function handleFormCancel() {
        if (state.editMode) {
            renderPage('activity-detail');
        } else {
            renderPage('home');
        }
    }

    // KPIの配列をチェック
    function validateKpiObjects(kpis) {
        if (!Array.isArray(kpis)) return [];
        
        return kpis.map(kpi => {
            if (typeof kpi === 'string') {
                return {
                    text: kpi,
                    deadline: getFutureDateString(10),
                    completed: false,
                    assignee: ASSIGNEES.BOTH
                };
            } else if (typeof kpi === 'object' && kpi !== null) {
                return {
                    text: kpi.text || '',
                    deadline: kpi.deadline || getFutureDateString(10),
                    completed: kpi.completed === true,
                    assignee: normalizeAssignee(kpi.assignee)
                };
            } else {
                return {
                    text: '',
                    deadline: getFutureDateString(10),
                    completed: false,
                    assignee: ASSIGNEES.BOTH
                };
            }
        });
    }
    
    // フォーム送信処理
    function handleFormSubmit(event) {
        event.preventDefault();
        
        // フォームからデータを取得
        const name = document.getElementById('activity-name').value;
        const timeline = document.getElementById('activity-timeline').value;
        const formProgress = parseInt(document.getElementById('activity-progress').value);
        
        // KPIを取得
        const kpis = [];
        const kpiGroups = document.querySelectorAll('.kpi-input-group');
        kpiGroups.forEach(group => {
            const kpiText = group.querySelector('.kpi-input').value.trim();
            const kpiDate = group.querySelector('.kpi-date-input').value;
            const kpiAssigneeSelect = group.querySelector('.kpi-assignee-select');
            const kpiAssignee = kpiAssigneeSelect ? normalizeAssignee(kpiAssigneeSelect.value) : ASSIGNEES.BOTH;

            if (kpiText && kpiDate) {
                kpis.push({
                    text: kpiText,
                    deadline: kpiDate,
                    completed: false, // 新規追加時は未完了
                    assignee: kpiAssignee
                });
            }
        });
        
        // フェーズを取得
        const phases = [];
        document.querySelectorAll('.phase-input').forEach(input => {
            if (input.value.trim()) {
                phases.push(input.value.trim());
            }
        });
        
        // タスクを取得
        const dailyTasks = [];
        document.querySelectorAll('.task-input-group').forEach(group => {
            const taskInput = group.querySelector('.task-input');
            const taskAssigneeSelect = group.querySelector('.task-assignee-select');
            const taskText = taskInput ? taskInput.value.trim() : '';
            const taskAssignee = taskAssigneeSelect ? normalizeAssignee(taskAssigneeSelect.value) : ASSIGNEES.BOTH;

            if (taskText) {
                dailyTasks.push({ text: taskText, assignee: taskAssignee });
            }
        });
        
        if (state.editMode) {
            // 活動の編集
            const activityIndex = state.activities.findIndex(a => a.id === state.currentActivity);
            if (activityIndex !== -1) {
                const oldActivity = state.activities[activityIndex];
                
                // 既存のKPIのcompleted状態を保持
                const mergedKpis = kpis.map(newKpi => {
                    // 既存のKPIで同じテキストを持つものを探す
                    const existingKpi = oldActivity.kpis.find(k =>
                        typeof k === 'object' && k.text === newKpi.text
                    );

                    // 既存のKPIが見つかった場合はcompleted状態を引き継ぐ
                    if (existingKpi) {
                        return {
                            ...newKpi,
                            completed: existingKpi.completed || false
                        };
                    }

                    return newKpi;
                });
                
                // 進捗度を計算
                let calculatedProgress;
                if (mergedKpis.length > 0) {
                    calculatedProgress = calculateProgressFromKPIs({ kpis: mergedKpis });
                } else {
                    calculatedProgress = formProgress;
                }
                
                const { purpose: _deprecatedPurpose, ...activityWithoutPurpose } = oldActivity;

                const updatedActivity = {
                    ...activityWithoutPurpose,
                    name,
                    timeline,
                    progress: calculatedProgress,
                    completed: calculatedProgress >= 100,
                    notes: oldActivity.notes || '',
                    kpis: mergedKpis,
                    phases,
                    dailyTasks: dailyTasks.map(task => ({
                        text: task.text,
                        assignee: task.assignee
                    })),
                    status: oldActivity.status,
                    statusManuallySet: oldActivity.statusManuallySet
                };

                initializeActivityStatus(updatedActivity);

                state.activities[activityIndex] = updatedActivity;
                
                // 今日のタスクも更新
                const today = getCurrentDate();
                if (state.dailyTasks[today]) {
                    // 古いタスクを削除（定期的なタスクのみ）
                    state.dailyTasks[today] = state.dailyTasks[today].filter(task =>
                        task.activityId !== oldActivity.id || !task.isRecurring
                    );

                    // 新しいタスクを追加（定期的なタスク）
                    if (!updatedActivity.completed) {
                        dailyTasks.forEach(task => {
                            state.dailyTasks[today].push({
                                id: generateId(),
                                activityId: oldActivity.id,
                                activityName: name,
                                name: task.text,
                                completed: false,
                                isRecurring: true,
                                assignee: task.assignee
                            });
                        });
                    }
                }
                
                    saveDataToFirestore();
                renderPage('activity-detail');
            }
        } else {
            // 新規活動の追加
            // 進捗度を計算
            let calculatedProgress;
            if (kpis.length > 0) {
                calculatedProgress = calculateProgressFromKPIs({ kpis });
            } else {
                calculatedProgress = formProgress;
            }
            
            const newActivity = {
                id: generateId(),
                name,
                timeline,
                progress: calculatedProgress,
                completed: calculatedProgress >= 100,
                notes: '',
                kpis,
                phases,
                dailyTasks: dailyTasks.map(task => ({
                    text: task.text,
                    assignee: task.assignee
                })),
                status: null,
                statusManuallySet: false
            };

            initializeActivityStatus(newActivity);

            state.activities.push(newActivity);

            // 毎日のタスクを今日のタスクに追加（完了していない場合のみ）
            if (dailyTasks && dailyTasks.length > 0 && !newActivity.completed) {
                const today = getCurrentDate();
                if (!state.dailyTasks[today]) {
                    state.dailyTasks[today] = [];
                }

                dailyTasks.forEach(task => {
                    state.dailyTasks[today].push({
                        id: generateId(),
                        activityId: newActivity.id,
                        activityName: name,
                        name: task.text,
                        completed: false,
                        isRecurring: true,
                        assignee: task.assignee
                    });
                });
            }
            
                    saveDataToFirestore();
            state.currentActivity = newActivity.id;
            renderPage('home');
        }
    }

    // =====================
    // イベントリスナー設定
    // =====================
    
    // 主要なイベントリスナーを設定する関数
    function setupEventListeners() {
        // ウィンドウのリサイズイベント
        window.addEventListener('resize', function() {
            // 必要に応じてレスポンシブ対応のコード
        });
    }

    // ナビゲーションのイベントリスナーを設定する関数
    function setupNavigationListeners() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                const page = this.dataset.page;

                // すべてのナビゲーションリンクのアクティブ状態を解除
                navLinks.forEach(l => l.classList.remove('active'));
                // クリックされたリンクをアクティブにする
                this.classList.add('active');

                // ホームページでのセクションジャンプ処理
                if (state.currentPage === 'home' && ['short-term', 'long-term', 'in-progress', 'completed'].includes(page)) {
                    // ページ内のセクションにスクロール
                    const section = document.getElementById(page);
                    if (section) {
                        // URLにハッシュを追加してブックマークしやすくする
                        window.history.pushState(null, null, `#${page}`);

                        // スムーズにスクロール
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        return;
                    }
                }

                // ページ遷移（ナビゲーションリンクのページを優先）
                renderPage(page);
            });
        });
    }
});
