document.addEventListener('DOMContentLoaded', function() {
    // アプリケーションの状態
    const state = {
        currentPage: 'home',
        activities: [],
        currentActivity: null,
        dailyTasks: {},
        editMode: false,
        editingItem: null,
        timeline: {}, // 追加：タイムラインのデータ
        userId: null
    };

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
                    state.timeline   = data.timeline   || {};
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
        checkTimelineReset();
        renderPage(state.currentPage);
    };

    window.onUserLogout = function() {
        state.userId = null;
        window.__unsubscribeFirestore && window.__unsubscribeFirestore();
        state.activities = [];
        state.dailyTasks = {};
        state.timeline = {};
        state._meta = null;
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
            state.timeline   = {};
            return;
        }
        try {
            const data = await loadData(state.userId); // ← index.htmlで定義済みの関数を呼ぶ
            state.activities = data.activities || [];
            state.dailyTasks = data.dailyTasks || {};
            state.timeline   = data.timeline   || {};

            // isRecurringフラグがない古いタスクに対してフラグを追加
            const today = getCurrentDate();
            if (state.dailyTasks[today]) {
                state.dailyTasks[today].forEach(task => {
                    if (task.isRecurring === undefined) {
                        task.isRecurring = true;
                    }
                });
            }
        } catch (error) {
            console.error('データのロード中にエラーが発生しました:', error);
            const initialData = initializeData();
            state.activities = initialData.activities;
            state.dailyTasks = initialData.dailyTasks;
            state.timeline   = {};
        }
    }

    // Firestoreにデータを保存
    async function saveDataToFirestore() {
        if (!state.userId) return;
        try {
            const __meta = await saveData(state.userId, { activities: state.activities, dailyTasks: state.dailyTasks, timeline: state.timeline });
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
        return new Date().toISOString().split('T')[0];
    }

    // 現在の日付の表示を更新
    function updateCurrentDate() {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        const formattedDate = today.toLocaleDateString('ja-JP', options);

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
            minute: '2-digit' 
        };
        const formattedDate = now.toLocaleDateString('ja-JP', options);

        // 各ページの更新日時を更新
        const lastUpdatedElements = document.querySelectorAll(
            '#last-updated-date, #footer-last-updated, #detail-last-updated, #detail-footer-last-updated, #tasks-footer-last-updated, #kpi-footer-last-updated, #timeline-footer-last-updated'
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
        
        // タイムラインのCSSを追加
        addTimelineStyles();
        
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
                    completed: kpi.completed !== undefined ? kpi.completed : false
                };
            }
            
            // 文字列の場合はオブジェクトに変換
            return {
                text: kpi,
                deadline: getFutureDateString(10),
                completed: false
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
                case 'dashboard':
                    template = document.getElementById('dashboard-template');
                    appContainer.appendChild(document.importNode(template.content, true));
                    renderDashboard();
                    break;
                case 'timeline':
                    template = document.getElementById('timeline-template');
                    appContainer.appendChild(document.importNode(template.content, true));
                    renderTimeline();
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
        
        const inProgressActivities = state.activities.filter(a => a.progress >= 20 && a.progress < 100 && !a.completed);
        const completedActivities = state.activities.filter(a => a.progress >= 100 || a.completed);
        
        // 進行中と完了済みを除いたアクティビティ
        const shortTermActivities = state.activities.filter(a => 
            a.timeline === 'short-term' && a.progress < 20 && !a.completed);
        const mediumTermActivities = state.activities.filter(a => 
            a.timeline === 'medium-term' && a.progress < 20 && !a.completed);
        const longTermActivities = state.activities.filter(a => 
            a.timeline === 'long-term' && a.progress < 20 && !a.completed);
        
        // 事業数のカウントを更新
        document.getElementById('short-term-count').textContent = shortTermActivities.length;
        document.getElementById('medium-term-count').textContent = mediumTermActivities.length;
        document.getElementById('long-term-count').textContent = longTermActivities.length;
        document.getElementById('in-progress-count').textContent = inProgressActivities.length;
        document.getElementById('completed-count').textContent = completedActivities.length;
        document.getElementById('total-count').textContent = state.activities.length;
        
        // 各カテゴリごとに事業カードをレンダリング
        renderActivityCards('short-term-cards', shortTermActivities, 'short-term');
        renderActivityCards('medium-term-cards', mediumTermActivities, 'medium-term');
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
            card.dataset.completed = activity.completed.toString();
            card.draggable = true;
            
            card.innerHTML = `
                <h4 class="activity-name">${activity.name}</h4>
                <p class="activity-purpose">${activity.purpose}</p>
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
                completed: this.dataset.completed
            }));
        });
        
        card.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
    }
    
    // ドロップゾーンのイベントリスナーを設定する関数
    function setupDropZone(container, zoneClass) {
        container.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        container.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });
        
        container.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                const activityId = data.id;
                const sourceTimeline = data.timeline;
                const isCompleted = data.completed === 'true';
                
                // 活動のタイムラインまたは完了状態を更新
                const activityIndex = state.activities.findIndex(a => a.id === activityId);
                if (activityIndex === -1) return;
                
                const activity = state.activities[activityIndex];
                let needsUpdate = false;
                
                // ドロップ先に応じた更新
                switch(zoneClass) {
                    case 'short-term':
                        activity.timeline = 'short-term';
                        if (activity.completed) {
                            activity.completed = false;
                            needsUpdate = true;
                        }
                        break;
                    case 'medium-term':
                        activity.timeline = 'medium-term';
                        if (activity.completed) {
                            activity.completed = false;
                            needsUpdate = true;
                        }
                        break;
                    case 'long-term':
                        activity.timeline = 'long-term';
                        if (activity.completed) {
                            activity.completed = false;
                            needsUpdate = true;
                        }
                        break;
                    case 'in-progress':
                        if (activity.progress < 20) {
                            activity.progress = 20;
                            needsUpdate = true;
                        }
                        if (activity.completed) {
                            activity.completed = false;
                            needsUpdate = true;
                        }
                        break;
                    case 'completed':
                        activity.completed = true;
                        activity.progress = 100;
                        needsUpdate = true;
                        
                        // 完了した事業のタスクを今日のタスクから削除
                        removeCompletedActivityTasks(activity.id);
                        break;
                }
                
                if (needsUpdate || activity.timeline !== sourceTimeline) {
                    saveDataToFirestore();
                    renderPage('home');
                }
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
        document.getElementById('detail-activity-purpose').textContent = activity.purpose;
        
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
                <div class="detail-item-content ${isCompleted ? 'completed-kpi' : ''}">${kpiText}</div>
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
                
                // 進捗度を再計算
                activity.progress = calculateProgressFromKPIs(activity);
                
                // 100%の場合は完了フラグも設定
                if (activity.progress >= 100) {
                    activity.completed = true;
                    // 完了した事業のタスクを今日のタスクから削除
                    removeCompletedActivityTasks(activity.id);
                } else {
                    activity.completed = false;
                }
                
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
                
                taskItem.innerHTML = `
                    <div class="detail-item-content">${task}</div>
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
            state.dailyTasks[today] = state.dailyTasks[today].filter(task => {
                if (task.activityId === activityId && task.name === taskToRemove && task.isRecurring) {
                    return false; // 削除するタスクと一致する場合は除外
                }
                return true;
            });
        }
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
    function renderDashboard() {
        updateLastUpdated();
        updateCurrentDate();
        
        // 全ての事業をステータスで分類
        const plannedActivities = state.activities.filter(a => a.progress < 20 && !a.completed);
        const inProgressActivities = state.activities.filter(a => a.progress >= 20 && a.progress < 100 && !a.completed);
        const completedActivities = state.activities.filter(a => a.progress >= 100 || a.completed);
        const totalActivities = state.activities.length;
        
        // KPIの集計
        let completedKPIs = 0;
        let pendingKPIs = 0;
        state.activities.forEach(activity => {
            if (Array.isArray(activity.kpis)) {
                activity.kpis.forEach(kpi => {
                    if (typeof kpi === 'object' && kpi !== null && kpi.completed) {
                        completedKPIs++;
                    } else {
                        pendingKPIs++;
                    }
                });
            }
        });
        const totalKPIs = completedKPIs + pendingKPIs;
        
        // タイムライン別の事業数と進捗
        const shortTermActivities = state.activities.filter(a => a.timeline === 'short-term');
        const mediumTermActivities = state.activities.filter(a => a.timeline === 'medium-term');
        const longTermActivities = state.activities.filter(a => a.timeline === 'long-term');
        
        const shortTermProgress = shortTermActivities.length > 0 ? 
            Math.round(shortTermActivities.reduce((acc, a) => acc + a.progress, 0) / shortTermActivities.length) : 0;
        const mediumTermProgress = mediumTermActivities.length > 0 ? 
            Math.round(mediumTermActivities.reduce((acc, a) => acc + a.progress, 0) / mediumTermActivities.length) : 0;
        const longTermProgress = longTermActivities.length > 0 ? 
            Math.round(longTermActivities.reduce((acc, a) => acc + a.progress, 0) / longTermActivities.length) : 0;
        
        // 今日のタスク完了状況
        const today = getCurrentDate();
        const todayTasks = state.dailyTasks[today] || [];
        const completedTasks = todayTasks.filter(task => task.completed).length;
        const pendingTasks = todayTasks.length - completedTasks;
        
        // 期限が近いKPI（7日以内）
        const upcomingKPIs = [];
        state.activities.forEach(activity => {
            if (Array.isArray(activity.kpis) && !activity.completed) {
                activity.kpis.forEach(kpi => {
                    if (typeof kpi === 'object' && kpi !== null && kpi.deadline && !kpi.completed) {
                        const deadline = new Date(kpi.deadline);
                        const today = new Date();
                        const diffTime = deadline.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays >= 0 && diffDays <= 7) {
                            upcomingKPIs.push({
                                text: kpi.text,
                                deadline: kpi.deadline,
                                diffDays: diffDays,
                                activity: activity.name
                            });
                        }
                    }
                });
            }
        });
        
        // 期限が近い順にソート
        upcomingKPIs.sort((a, b) => a.diffDays - b.diffDays);
        
        // 表示をアップデート
        document.getElementById('planned-count').textContent = plannedActivities.length;
        document.getElementById('progress-count').textContent = inProgressActivities.length;
        document.getElementById('complete-count').textContent = completedActivities.length;
        document.getElementById('total-activities-count').textContent = totalActivities;
        
        document.getElementById('completed-kpi-count').textContent = completedKPIs;
        document.getElementById('pending-kpi-count').textContent = pendingKPIs;
        document.getElementById('total-kpi-count').textContent = totalKPIs;
        
        document.getElementById('completed-tasks-count').textContent = completedTasks;
        document.getElementById('pending-tasks-count').textContent = pendingTasks;
        document.getElementById('total-tasks-count').textContent = todayTasks.length;
        
        // 期限が近いKPIリストを表示
        const upcomingKpiList = document.getElementById('upcoming-kpi-list');
        upcomingKpiList.innerHTML = '';
        
        if (upcomingKPIs.length === 0) {
            upcomingKpiList.innerHTML = '<div class="empty-list-message">期限が近いKPIはありません</div>';
        } else {
            upcomingKPIs.slice(0, 5).forEach(kpi => {
                const deadlineDate = new Date(kpi.deadline);
                const formattedDate = `${deadlineDate.getMonth() + 1}/${deadlineDate.getDate()}`;
                
                const kpiItem = document.createElement('div');
                kpiItem.className = 'upcoming-kpi-item';
                kpiItem.innerHTML = `
                    <div class="upcoming-kpi-content">
                        <div class="upcoming-kpi-text">${kpi.text}</div>
                        <div class="upcoming-kpi-activity">${kpi.activity}</div>
                    </div>
                    <div class="upcoming-kpi-deadline">残り ${kpi.diffDays} 日 (${formattedDate})</div>
                `;
                upcomingKpiList.appendChild(kpiItem);
            });
        }
        
        // 最近の活動リストを表示（例として進捗率の高い事業を表示）
        const recentActivitiesList = document.getElementById('recent-activities-list');
        recentActivitiesList.innerHTML = '';
        
        const sortedByProgress = [...state.activities].sort((a, b) => b.progress - a.progress);
        
        if (sortedByProgress.length === 0) {
            recentActivitiesList.innerHTML = '<div class="empty-list-message">アクティブな事業はありません</div>';
        } else {
            sortedByProgress.slice(0, 5).forEach(activity => {
                const activityItem = document.createElement('div');
                activityItem.className = 'activity-item';
                activityItem.innerHTML = `
                    <div class="activity-item-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="activity-item-content">
                        <div class="activity-item-title">${activity.name}</div>
                        <div class="activity-item-progress">進捗度: ${activity.progress}%</div>
                    </div>
                `;
                recentActivitiesList.appendChild(activityItem);
            });
        }
        
        // グラフの描画
        renderDashboardCharts(
            [plannedActivities.length, inProgressActivities.length, completedActivities.length],
            [completedKPIs, pendingKPIs],
            [
                { label: '短期', count: shortTermActivities.length, progress: shortTermProgress },
                { label: '中期', count: mediumTermActivities.length, progress: mediumTermProgress },
                { label: '長期', count: longTermActivities.length, progress: longTermProgress }
            ],
            [completedTasks, pendingTasks]
        );
    }
    
    // ダッシュボードのグラフを描画する関数
    function renderDashboardCharts(progressData, kpiData, timelineData, taskData) {
        // 全体進捗状況のパイチャート
        const progressPieCtx = document.getElementById('progress-pie-chart').getContext('2d');
        const progressPieChart = new Chart(progressPieCtx, {
            type: 'pie',
            data: {
                labels: ['計画済み', '進行中', '完了'],
                datasets: [{
                    data: progressData,
                    backgroundColor: ['#f1c40f', '#3498db', '#2ecc71'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // KPI達成状況のパイチャート
        const kpiPieCtx = document.getElementById('kpi-pie-chart').getContext('2d');
        const kpiPieChart = new Chart(kpiPieCtx, {
            type: 'pie',
            data: {
                labels: ['達成済み', '未達成'],
                datasets: [{
                    data: kpiData,
                    backgroundColor: ['#2ecc71', '#e74c3c'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // タイムライン別進捗の棒グラフ
        const timelineBarCtx = document.getElementById('timeline-bar-chart').getContext('2d');
        const timelineBarChart = new Chart(timelineBarCtx, {
            type: 'bar',
            data: {
                labels: timelineData.map(item => item.label),
                datasets: [
                    {
                        label: '事業数',
                        data: timelineData.map(item => item.count),
                        backgroundColor: '#3498db',
                        borderWidth: 1,
                        order: 2
                    },
                    {
                        label: '平均進捗率 (%)',
                        data: timelineData.map(item => item.progress),
                        type: 'line',
                        borderColor: '#e74c3c',
                        pointBackgroundColor: '#e74c3c',
                        tension: 0.1,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
        
        // タスク完了率のドーナツチャート
        const taskDoughnutCtx = document.getElementById('task-doughnut-chart').getContext('2d');
        const taskDoughnutChart = new Chart(taskDoughnutCtx, {
            type: 'doughnut',
            data: {
                labels: ['完了', '未完了'],
                datasets: [{
                    data: taskData,
                    backgroundColor: ['#2ecc71', '#e74c3c'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '70%'
            }
        });
    }

    // KPI一覧ページをレンダリングする関数
    function renderKpiList() {
        updateCurrentDate();
        updateLastUpdated();
        
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
                            completed: kpi.completed
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
        
        // グリッドコンテナを作成
        const gridContainer = document.createElement('div');
        gridContainer.className = 'kpi-grid';
        kpiContainer.appendChild(gridContainer);
        
        // KPIが無い場合のメッセージ
        if (allKpis.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-list-message';
            emptyMessage.textContent = 'KPIはありません';
            gridContainer.appendChild(emptyMessage);
        } else {
            // KPIカードを作成
            allKpis.forEach(kpi => {
                const kpiCard = createKpiCard(kpi);
                gridContainer.appendChild(kpiCard);
            });
        }
        
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
        document.getElementById('kpi-footer-last-updated').textContent = 
            document.getElementById('last-updated-date').textContent;
    }

    // KPIカードを作成する関数
    function createKpiCard(kpi) {
        const card = document.createElement('div');
        card.className = `kpi-card ${kpi.completed ? 'kpi-completed' : ''}`;
        card.dataset.id = kpi.id;
        card.dataset.activityId = kpi.activityId;
        
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
            
            // 進捗度を再計算
            activity.progress = calculateProgressFromKPIs(activity);
            
            // 100%の場合は完了フラグも設定
            if (activity.progress >= 100) {
                activity.completed = true;
                // 完了した事業のタスクを今日のタスクから削除
                removeCompletedActivityTasks(activity.id);
            } else {
                activity.completed = false;
            }
            
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
        
        const today = getCurrentDate();
        const tasksContainer = document.getElementById('daily-tasks-container');
        tasksContainer.innerHTML = '';
        
        // 今日のタスクが無い場合は新しく作成
        if (!state.dailyTasks[today]) {
            state.dailyTasks[today] = [];
            
            // 各活動の毎日のタスクをコピー（タスクが存在する場合のみ、完了していない事業のみ）
            state.activities.forEach(activity => {
                if (activity.dailyTasks && activity.dailyTasks.length > 0 && !activity.completed) {
                    activity.dailyTasks.forEach(task => {
                        state.dailyTasks[today].push({
                            id: generateId(),
                            activityId: activity.id,
                            activityName: activity.name,
                            name: task,
                            completed: false,
                            isRecurring: true
                        });
                    });
                }
            });
            
                    saveDataToFirestore();
        }
        
        // 完了した事業のタスクを除外する
        const completedActivityIds = state.activities
            .filter(a => a.completed)
            .map(a => a.id);
            
        state.dailyTasks[today] = state.dailyTasks[today].filter(task => 
            !completedActivityIds.includes(task.activityId) || !task.isRecurring
        );
        
        // タスクをグループ分け
        const recurringTasks = state.dailyTasks[today].filter(task => task.isRecurring);
        const temporaryTasks = state.dailyTasks[today].filter(task => !task.isRecurring);
        
        // 各グループをソート (活動名でソート)
        recurringTasks.sort((a, b) => a.activityName.localeCompare(b.activityName));
        
        // タスク追加セクションの表示
        const addTaskSection = document.createElement('div');
        addTaskSection.className = 'daily-task-add-section';
        addTaskSection.innerHTML = `
            <h3 class="daily-task-section-title">今日だけのタスクを追加</h3>
            <div class="task-add-form">
                <input type="text" id="new-temporary-task" placeholder="新しいタスクを入力..." class="task-add-input">
                <button id="add-temporary-task-btn" class="task-add-btn">
                    <i class="fas fa-plus"></i> 追加
                </button>
            </div>
        `;
        tasksContainer.appendChild(addTaskSection);
        
        // 今日だけのタスクを表示
        if (temporaryTasks.length > 0) {
            const temporarySection = document.createElement('div');
            temporarySection.className = 'daily-task-section temporary-tasks';
            temporarySection.innerHTML = `
                <h3 class="daily-task-section-title">今日だけのタスク</h3>
                <div class="daily-task-list temporary-task-list"></div>
            `;
            tasksContainer.appendChild(temporarySection);
            
            const temporaryList = temporarySection.querySelector('.temporary-task-list');
            renderTaskList(temporaryList, temporaryTasks);
        }
        
        // 区切り線を追加
        const divider = document.createElement('div');
        divider.className = 'task-section-divider';
        tasksContainer.appendChild(divider);
        
        // 毎日のタスクを表示
        if (recurringTasks.length > 0) {
            const recurringSection = document.createElement('div');
            recurringSection.className = 'daily-task-section recurring-tasks';
            recurringSection.innerHTML = `
                <h3 class="daily-task-section-title">事業の毎日のタスク</h3>
                <div class="daily-task-list recurring-task-list"></div>
            `;
            tasksContainer.appendChild(recurringSection);
            
            const recurringList = recurringSection.querySelector('.recurring-task-list');
            renderTaskList(recurringList, recurringTasks);
        } else {
            const emptySection = document.createElement('div');
            emptySection.className = 'daily-task-section';
            emptySection.innerHTML = `
                <h3 class="daily-task-section-title">事業の毎日のタスク</h3>
                <div class="empty-list-message">毎日のタスクはありません</div>
            `;
            tasksContainer.appendChild(emptySection);
        }
        
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
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const filter = button.dataset.filter;
                filterTasks(filter);
            });
        });
    }
    
    // タスクリストをレンダリングする共通関数
    function renderTaskList(container, tasks) {
        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = `task-item ${task.completed ? 'task-completed' : ''}`;
            taskItem.dataset.id = task.id;
            
            let activityInfo = '';
            if (task.activityName) {
                activityInfo = `<div class="task-activity">${task.activityName}</div>`;
            }
            
            taskItem.innerHTML = `
                <div class="task-checkbox-wrapper">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                </div>
                <div class="task-content">
                    <div class="task-name">${task.name}</div>
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
                updateTaskCompletion();
                    saveDataToFirestore();
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
    
    // 一時的なタスクを追加する関数
    function addTemporaryTask() {
        const taskInput = document.getElementById('new-temporary-task');
        const taskText = taskInput.value.trim();
        
        if (taskText) {
            const today = getCurrentDate();
            const newTask = {
                id: generateId(),
                name: taskText,
                completed: false,
                isRecurring: false
            };
            
            if (!state.dailyTasks[today]) {
                state.dailyTasks[today] = [];
            }
            
            state.dailyTasks[today].push(newTask);
                    saveDataToFirestore();
            
            // 入力フィールドをクリア
            taskInput.value = '';
            
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
                        newItem = { text: kpiText, deadline: selectedDate, completed: false };
                        activity.kpis.push(newItem);
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
                
                // 毎日のタスク配列が存在しない場合は作成
                if (!activity.dailyTasks) {
                    activity.dailyTasks = [];
                }
                
                activity.dailyTasks.push(taskText);
                
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
                        isRecurring: true
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
        document.getElementById('activity-purpose').value = activity.purpose;
        document.getElementById('activity-timeline').value = activity.timeline;
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
            
            inputGroup.innerHTML = `
                <input type="text" class="kpi-input" placeholder="KPI" value="${kpiText}" required>
                <input type="date" class="kpi-date-input" value="${kpiDeadline}" required>
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
                inputGroup.className = 'input-group';
                
                inputGroup.innerHTML = `
                    <input type="text" class="task-input" placeholder="タスク" value="${task}">
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
            inputGroup.className = 'input-group';
            
            inputGroup.innerHTML = `
                <input type="text" class="task-input" placeholder="タスク">
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
                <button type="button" class="remove-item-btn kpi-remove-btn">
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
                    completed: false
                };
            } else if (typeof kpi === 'object' && kpi !== null) {
                return {
                    text: kpi.text || '',
                    deadline: kpi.deadline || getFutureDateString(10),
                    completed: kpi.completed === true
                };
            } else {
                return {
                    text: '',
                    deadline: getFutureDateString(10),
                    completed: false
                };
            }
        });
    }
    
    // フォーム送信処理
    function handleFormSubmit(event) {
        event.preventDefault();
        
        // フォームからデータを取得
        const name = document.getElementById('activity-name').value;
        const purpose = document.getElementById('activity-purpose').value;
        const timeline = document.getElementById('activity-timeline').value;
        const formProgress = parseInt(document.getElementById('activity-progress').value);
        
        // KPIを取得
        const kpis = [];
        const kpiGroups = document.querySelectorAll('.kpi-input-group');
        kpiGroups.forEach(group => {
            const kpiText = group.querySelector('.kpi-input').value.trim();
            const kpiDate = group.querySelector('.kpi-date-input').value;
            
            if (kpiText && kpiDate) {
                kpis.push({
                    text: kpiText,
                    deadline: kpiDate,
                    completed: false // 新規追加時は未完了
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
        document.querySelectorAll('.task-input').forEach(input => {
            if (input.value.trim()) {
                dailyTasks.push(input.value.trim());
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
                
                const updatedActivity = {
                    ...oldActivity,
                    name,
                    purpose,
                    timeline,
                    progress: calculatedProgress,
                    completed: calculatedProgress >= 100 || oldActivity.completed,
                    notes: oldActivity.notes || '',
                    kpis: mergedKpis,
                    phases,
                    dailyTasks: dailyTasks || [] // タスクがなければ空の配列に
                };
                
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
                                name: task,
                                completed: false,
                                isRecurring: true
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
                purpose,
                timeline,
                progress: calculatedProgress,
                completed: calculatedProgress >= 100,
                notes: '',
                kpis,
                phases,
                dailyTasks: dailyTasks || [] // 毎日のタスクが無い場合は空配列に
            };
            
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
                        name: task,
                        completed: false,
                        isRecurring: true
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
                if (state.currentPage === 'home' && ['short-term', 'medium-term', 'long-term', 'in-progress', 'completed'].includes(page)) {
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
    
    // =====================
    // タイムライン機能
    // =====================
    
    // タイムラインのCSSを追加する関数
    function addTimelineStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* タイムラインページのスタイル */
            .timeline-control-bar {
                display: flex;
                justify-content: space-between;
                margin-bottom: 1.5rem;
            }
            
            .control-btn {
                padding: 0.5rem 1rem;
                background-color: var(--accent-light);
                color: var(--accent-color);
                border: none;
                border-radius: var(--card-radius);
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.2s ease;
            }
            
            .control-btn:hover {
                background-color: var(--accent-color);
                color: white;
            }

            .timeline-container {
                background-color: white;
                border-radius: var(--card-radius);
                box-shadow: var(--shadow);
                margin-bottom: 2rem;
                overflow: hidden;
            }
            
            .timeline-header {
                display: flex;
                background-color: var(--primary-color);
                color: white;
                padding: 0.8rem;
            }
            
            .time-column {
                width: 80px;
                font-weight: 600;
                text-align: center;
            }
            
            .schedule-column {
                flex: 1;
                font-weight: 600;
                text-align: center;
            }
            
            .timeline-body {
                max-height: 600px;
                overflow-y: auto;
            }
            
            .time-slot {
                display: flex;
                border-bottom: 1px solid var(--border-color);
                min-height: 40px;
            }
            
            .time-slot:last-child {
                border-bottom: none;
            }
            
            .time-label {
                width: 80px;
                padding: 0.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: var(--bg-color);
                font-weight: 500;
                border-right: 1px solid var(--border-color);
                font-size: 0.9rem;
            }
            
            .time-content {
                flex: 1;
                padding: 0.5rem;
                min-height: 40px;
                transition: background-color 0.2s ease;
                display: flex;
                flex-wrap: nowrap;
                overflow-x: auto;
                gap: 8px;
            }
            
            .time-content.drag-over {
                background-color: var(--accent-light);
            }
            
            .timeline-item {
                background-color: var(--accent-light);
                color: var(--accent-color);
                padding: 0.5rem;
                border-radius: 4px;
                cursor: grab;
                font-size: 0.9rem;
                border-left: 4px solid var(--accent-color);
                transition: all 0.2s ease;
                position: relative;
                flex: 0 0 auto;
                width: 200px;
            }
            
            .timeline-item:hover {
                background-color: var(--accent-color);
                color: white;
            }
            
            .timeline-item.kpi-item {
                background-color: #e8f5e9;
                color: #2e7d32;
                border-left-color: #2e7d32;
            }
            
            .timeline-item.kpi-item:hover {
                background-color: #2e7d32;
                color: white;
            }
            
            .timeline-item.task-item {
                background-color: #fff3e0;
                color: #e65100;
                border-left-color: #e65100;
            }
            
            .timeline-item.task-item:hover {
                background-color: #e65100;
                color: white;
            }
            
            .timeline-item-content {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                padding-right: 20px;
            }
            
            .timeline-item-source {
                font-size: 0.7rem;
                opacity: 0.8;
                margin-top: 0.2rem;
            }
            
            .current-time-indicator {
                position: absolute;
                left: 0;
                right: 0;
                height: 2px;
                background-color: #3498db;
                z-index: 10;
            }
            
            .current-time-label {
                position: absolute;
                left: 0;
                background-color: #3498db;
                color: white;
                font-size: 0.7rem;
                padding: 2px 5px;
                border-radius: 3px;
                transform: translateY(-50%);
                z-index: 10;
            }
            
            .draggable-item {
                background-color: white;
                padding: 0.8rem;
                border-radius: 4px;
                margin-bottom: 0.8rem;
                cursor: grab;
                border: 1px solid var(--border-color);
                font-size: 0.9rem;
                transition: all 0.2s ease;
                position: relative;
            }
            
            .draggable-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            
            .draggable-item.dragging {
                opacity: 0.6;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
            }
            
            .draggable-item-content {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .draggable-item-source {
                font-size: 0.8rem;
                color: var(--text-secondary);
                margin-top: 0.3rem;
            }
            
            .kpi-deadline-tag {
                position: absolute;
                top: 4px;
                right: 4px;
                background-color: #f39c12;
                color: white;
                font-size: 0.7rem;
                padding: 2px 6px;
                border-radius: 10px;
                white-space: nowrap;
            }
            
            .draggable-item.kpi-draggable {
                border-left: 4px solid #2e7d32;
            }
            
            .draggable-item.task-draggable {
                border-left: 4px solid #e65100;
            }
            
            .timeline-item .delete-btn {
                position: absolute;
                top: 4px;
                right: 4px;
                width: 18px;
                height: 18px;
                background-color: rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 10px;
                color: #e74c3c;
                opacity: 0;
                transition: opacity 0.2s ease;
                border: none;
            }
            
            .timeline-item:hover .delete-btn {
                opacity: 1;
            }
            
            .timeline-item .delete-btn:hover {
                background-color: #e74c3c;
                color: white;
            }
            
            .dragging {
                opacity: 0.5;
            }
            
            .timeline-tab {
                padding: 8px 16px;
                background: none;
                border: none;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                font-weight: 500;
                transition: all 0.3s ease;
            }
            
            .timeline-tab.active {
                border-bottom-color: var(--accent-color);
                color: var(--accent-color);
            }
            
            .timeline-tab-content {
                display: none;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .timeline-tab-content.active {
                display: block;
            }
        `;
        document.head.appendChild(style);
    }

    // タイムラインページをレンダリングする関数
    function renderTimeline() {
        updateCurrentDate();
        updateLastUpdated();
        
        // タイムラインの現在の日付を設定
        const currentDateElement = document.getElementById('timeline-current-date');
        if (currentDateElement) {
            const today = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            currentDateElement.textContent = today.toLocaleDateString('ja-JP', options);
        }
        
        // タイムラインデータの初期化
        const today = getCurrentDate();
        if (!state.timeline[today]) {
            initializeTimelineData(today);
        }
        
        // タイムスロットを生成
        generateTimeSlots();
        
        // KPIアイテムをロード
        loadKpiItems();
        
        // タスクアイテムをロード
        loadTaskItems();
        
        // タブの切り替え機能を設定
        setupTimelineTabs();
        
        // 現在時刻のインジケーターを表示
        showCurrentTimeIndicator();
        
        // ドラッグ&ドロップイベントの設定
        setupTimelineDragDrop();
        
        // コントロールボタンのイベント設定
        document.getElementById('clear-timeline-btn').addEventListener('click', clearTimeline);
        
        // フッターの更新日時を更新
        document.getElementById('timeline-footer-last-updated').textContent = 
            document.getElementById('last-updated-date').textContent;
    }

    // タイムラインデータを初期化する関数
    function initializeTimelineData(date) {
        if (!state.timeline) {
            state.timeline = {};
        }
        
        state.timeline[date] = {};
        
        // 7:00から22:00まで30分おきに初期化
        for (let hour = 7; hour <= 22; hour++) {
            state.timeline[date][`${hour.toString().padStart(2, '0')}:00`] = [];
            
            if (hour < 22) {
                state.timeline[date][`${hour.toString().padStart(2, '0')}:30`] = [];
            }
        }
        
        saveTimelineData();
    }

    // タイムラインデータを保存する関数
    async function saveTimelineData() {
        try {
            await saveDataToFirestore();
            updateLastUpdated();
        } catch (error) {
            console.error('タイムラインデータの保存中にエラーが発生しました:', error);
        }
    }

    // タイムスロットを生成する関数
    function generateTimeSlots() {
        const timelineBody = document.getElementById('timeline-body');
        if (!timelineBody) return;
        
        timelineBody.innerHTML = '';
        
        const today = getCurrentDate();
        const timelineData = state.timeline[today] || {};
        
        // 7:00から22:00まで30分おきにスロットを生成
        for (let hour = 7; hour <= 22; hour++) {
            // 00分のスロット
            const timeSlot00 = createTimeSlot(
                `${hour.toString().padStart(2, '0')}:00`, 
                timelineData[`${hour.toString().padStart(2, '0')}:00`] || []
            );
            timelineBody.appendChild(timeSlot00);
            
            // 30分のスロット（22:30は不要）
            if (hour < 22) {
                const timeSlot30 = createTimeSlot(
                    `${hour.toString().padStart(2, '0')}:30`, 
                    timelineData[`${hour.toString().padStart(2, '0')}:30`] || []
                );
                timelineBody.appendChild(timeSlot30);
            }
        }
    }

    // 時間スロットを作成する関数
    function createTimeSlot(time, items) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = time;
        
        const timeContent = document.createElement('div');
        timeContent.className = 'time-content';
        timeContent.dataset.time = time;
        
        // タイムスロットに登録されているアイテムを表示
        items.forEach(item => {
            const timelineItem = createTimelineItem(item, time);
            timeContent.appendChild(timelineItem);
        });
        
        timeSlot.appendChild(timeLabel);
        timeSlot.appendChild(timeContent);
        
        return timeSlot;
    }

    // タイムラインアイテムを作成する関数
    function createTimelineItem(item, slotTime) {
        const timelineItem = document.createElement('div');
        // ユニークなID生成
        const uniqueItemId = `${slotTime}-${item.id}`;
        timelineItem.className = `timeline-item ${item.type}-item`;
        timelineItem.dataset.id = item.id;
        timelineItem.dataset.uniqueId = uniqueItemId;
        timelineItem.dataset.type = item.type;
        timelineItem.dataset.sourceId = item.sourceId;
        timelineItem.dataset.slotTime = slotTime;
        timelineItem.draggable = true;
        
        const itemContent = document.createElement('div');
        itemContent.className = 'timeline-item-content';
        itemContent.textContent = item.text;
        
        const itemSource = document.createElement('div');
        itemSource.className = 'timeline-item-source';
        itemSource.textContent = item.activityName || '';
        
        // 削除ボタンを追加
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // この特定のスロットからのみアイテムを削除
            removeTimelineItem(item.id, slotTime);
            timelineItem.remove();
        });
        
        timelineItem.appendChild(deleteBtn);
        timelineItem.appendChild(itemContent);
        timelineItem.appendChild(itemSource);
        
        // ドラッグイベントのセットアップ
        timelineItem.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('application/json', JSON.stringify({
                ...item,
                slotTime
            }));
            this.classList.add('dragging');
        });
        
        timelineItem.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
        
        return timelineItem;
    }

    // 特定のスロットからタイムラインアイテムを削除する関数
    function removeTimelineItem(itemId, slotTime) {
        const today = getCurrentDate();
        if (state.timeline[today] && state.timeline[today][slotTime]) {
            // 特定のスロットからのみ対象のアイテムを削除
            state.timeline[today][slotTime] = state.timeline[today][slotTime].filter(item => 
                item.id !== itemId
            );
            saveTimelineData();
        }
    }

    // KPIアイテムをロード関数
    function loadKpiItems() {
        const kpiList = document.getElementById('kpi-items-list');
        if (!kpiList) return;
        
        kpiList.innerHTML = '';
        
        // 未完了のKPIを取得
        const pendingKpis = [];
        state.activities.forEach(activity => {
            if (!activity.completed && Array.isArray(activity.kpis)) {
                activity.kpis.forEach(kpi => {
                    if (typeof kpi === 'object' && kpi !== null && !kpi.completed) {
                        // 残り日数を計算
                        const daysRemaining = calculateDaysRemaining(kpi.deadline);
                        
                        pendingKpis.push({
                            id: generateId(),
                            type: 'kpi',
                            sourceId: activity.id + '-' + kpi.text,
                            text: kpi.text,
                            activityId: activity.id,
                            activityName: activity.name,
                            deadline: kpi.deadline,
                            daysRemaining: daysRemaining
                        });
                    }
                });
            }
        });
        
        // 残り日数でソート
        pendingKpis.sort((a, b) => a.daysRemaining - b.daysRemaining);
        
        // KPIアイテムを表示
        if (pendingKpis.length === 0) {
            kpiList.innerHTML = '<div class="empty-list-message">未達成のKPIはありません</div>';
        } else {
            pendingKpis.forEach(kpi => {
                const kpiItem = createDraggableItem(kpi);
                kpiList.appendChild(kpiItem);
            });
        }
    }

    // タスクアイテムをロード関数
    function loadTaskItems() {
        const todayTasksList = document.getElementById('today-tasks-list');
        const dailyTasksList = document.getElementById('daily-tasks-list-timeline');
        
        if (!todayTasksList || !dailyTasksList) return;
        
        todayTasksList.innerHTML = '';
        dailyTasksList.innerHTML = '';
        
        const today = getCurrentDate();
        const todayTasks = state.dailyTasks[today] || [];
        
        // 今日だけのタスク（isRecurring=false）
        const temporaryTasks = todayTasks.filter(task => !task.isRecurring).map(task => ({
            id: generateId(),
            type: 'task',
            sourceId: task.id,
            text: task.name,
            activityId: task.activityId || '',
            activityName: task.activityName || '今日のタスク'
        }));
        
        // 毎日のタスク（isRecurring=true）
        const recurringTasks = todayTasks.filter(task => task.isRecurring).map(task => ({
            id: generateId(),
            type: 'task',
            sourceId: task.id,
            text: task.name,
            activityId: task.activityId || '',
            activityName: task.activityName || ''
        }));
        
        // 今日のタスクを表示
        if (temporaryTasks.length === 0) {
            todayTasksList.innerHTML = '<div class="empty-list-message">今日だけのタスクはありません</div>';
        } else {
            temporaryTasks.forEach(task => {
                const taskItem = createDraggableItem(task);
                todayTasksList.appendChild(taskItem);
            });
        }
        
        // 毎日のタスクを表示
        if (recurringTasks.length === 0) {
            dailyTasksList.innerHTML = '<div class="empty-list-message">毎日のタスクはありません</div>';
        } else {
            recurringTasks.forEach(task => {
                const taskItem = createDraggableItem(task);
                dailyTasksList.appendChild(taskItem);
            });
        }
    }

    // ドラッグ可能なアイテムを作成する関数
    function createDraggableItem(item) {
        const draggableItem = document.createElement('div');
        draggableItem.className = `draggable-item ${item.type}-draggable`;
        draggableItem.dataset.id = item.id;
        draggableItem.dataset.type = item.type;
        draggableItem.dataset.sourceId = item.sourceId;
        draggableItem.draggable = true;
        
        const itemContent = document.createElement('div');
        itemContent.className = 'draggable-item-content';
        itemContent.textContent = item.text;
        
        const itemSource = document.createElement('div');
        itemSource.className = 'draggable-item-source';
        itemSource.textContent = item.activityName || '';
        
        draggableItem.appendChild(itemContent);
        draggableItem.appendChild(itemSource);
        
        // KPIの場合は残り日数タグを追加
        if (item.type === 'kpi' && item.deadline) {
            const deadlineTag = document.createElement('div');
            deadlineTag.className = 'kpi-deadline-tag';
            // 期限切れや期限が近い場合の表示調整
            if (item.daysRemaining < 0) {
                deadlineTag.textContent = `期限切れ (${Math.abs(item.daysRemaining)}日)`;
                deadlineTag.style.backgroundColor = '#e74c3c'; // 赤色
            } else if (item.daysRemaining === 0) {
                deadlineTag.textContent = '本日期限';
                deadlineTag.style.backgroundColor = '#e74c3c'; // 赤色
            } else if (item.daysRemaining <= 3) {
                deadlineTag.textContent = `残り ${item.daysRemaining}日`;
                deadlineTag.style.backgroundColor = '#f39c12'; // オレンジ色
            } else {
                deadlineTag.textContent = `残り ${item.daysRemaining}日`;
            }
            draggableItem.appendChild(deadlineTag);
        }
        
        // ドラッグイベントのセットアップ
        draggableItem.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('application/json', JSON.stringify(item));
            this.classList.add('dragging');
        });
        
        draggableItem.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
        
        return draggableItem;
    }

    // タイムラインのタブ切り替え機能をセットアップする関数
    function setupTimelineTabs() {
        // タブボタンを取得
        const tabButtons = document.querySelectorAll('.timeline-tab');
        
        // 各タブボタンにイベントリスナーを設定
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // すべてのタブを非アクティブにする
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // クリックされたタブをアクティブにする
                button.classList.add('active');
                
                // タブコンテンツを切り替える
                const tabId = button.dataset.tab;
                
                // すべてのタブコンテンツを非表示にする
                document.querySelectorAll('.timeline-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // 対応するタブコンテンツを表示する
                document.getElementById(`${tabId}-tab-content`).classList.add('active');
            });
        });
    }

    // 現在時刻のインジケーターを表示する関数
    function showCurrentTimeIndicator() {
        // 現在時刻を取得
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // 7:00から22:00の間のみ表示
        if (hours < 7 || hours >= 22) return;
        
        // 時間枠を取得
        const timelineBody = document.getElementById('timeline-body');
        if (!timelineBody) return;
        
        // インジケーターの位置を計算
        // 1時間のスロットの高さを計算
        const timeSlots = timelineBody.querySelectorAll('.time-slot');
        if (timeSlots.length === 0) return;
        
        // 時間枠の参照時刻を計算（7:00を基準とする）
        const referenceHour = 7;
        const referenceMinute = 0;
        
        // 現在時刻の参照時刻からの経過分数
        const totalMinutesSinceReference = (hours - referenceHour) * 60 + (minutes - referenceMinute);
        
        // 1スロットあたりの高さ
        const slotHeight = timeSlots[0].offsetHeight;
        
        // インジケーターの位置（トップからの距離）
        const indicatorPosition = (totalMinutesSinceReference / 30) * slotHeight;
        
        // インジケーターを作成して配置
        const indicator = document.createElement('div');
        indicator.className = 'current-time-indicator';
        indicator.style.top = `${indicatorPosition}px`;
        
        // 時刻ラベルを作成
        const timeLabel = document.createElement('div');
        timeLabel.className = 'current-time-label';
        timeLabel.style.top = `${indicatorPosition}px`;
        timeLabel.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        // タイムラインにインジケーターを追加
        timelineBody.appendChild(indicator);
        timelineBody.appendChild(timeLabel);
        
        // 1分ごとにインジケーターを更新
        setTimeout(() => {
            if (timelineBody.contains(indicator)) {
                timelineBody.removeChild(indicator);
            }
            if (timelineBody.contains(timeLabel)) {
                timelineBody.removeChild(timeLabel);
            }
            if (state.currentPage === 'timeline') {
                showCurrentTimeIndicator();
            }
        }, 60000);
    }

    // タイムラインのドラッグ&ドロップイベントを設定する関数
    function setupTimelineDragDrop() {
        const timeSlotContents = document.querySelectorAll('.time-content');
        
        timeSlotContents.forEach(slot => {
            // dragoverイベント
            slot.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('drag-over');
            });
            
            // dragleaveイベント
            slot.addEventListener('dragleave', function() {
                this.classList.remove('drag-over');
            });
            
            // dropイベント
            slot.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('drag-over');
                
                try {
                    const itemData = JSON.parse(e.dataTransfer.getData('application/json'));
                    const time = this.dataset.time;
                    const today = getCurrentDate();
                    
                    // 同じアイテムからの内部移動なら元のスロットから削除
                    if (itemData.slotTime) {
                        removeTimelineItem(itemData.id, itemData.slotTime);
                    }
                    
                    // 新規ID生成（それぞれのスロットで別のIDを持つよう修正）
                    const newItemData = {
                        ...itemData,
                        id: generateId() // 新しいIDを生成
                    };
                    
                    // タイムラインにアイテムを追加
                    if (!state.timeline[today][time]) {
                        state.timeline[today][time] = [];
                    }
                    
                    state.timeline[today][time].push(newItemData);
                    saveTimelineData();
                    
                    // タイムスロットにアイテムを追加
                    const timelineItem = createTimelineItem(newItemData, time);
                    this.appendChild(timelineItem);
                    
                } catch (error) {
                    console.error('ドロップ処理中にエラーが発生しました:', error);
                }
            });
        });
    }

    // タイムラインをクリアする関数
    function clearTimeline() {
        if (confirm('タイムラインをクリアしますか？')) {
            const today = getCurrentDate();
            
            // 各時間スロットを空の配列で初期化
            for (const time in state.timeline[today]) {
                state.timeline[today][time] = [];
            }
            
            saveTimelineData();
            
            // タイムラインを再レンダリング
            generateTimeSlots();
            
            // 現在時刻のインジケーターを表示
            showCurrentTimeIndicator();
            
            // ドラッグ&ドロップイベントを再設定
            setupTimelineDragDrop();
        }
    }

    // 現在のタイムラインが古いかどうかをチェックする関数
    function checkTimelineReset() {
        const today = getCurrentDate();
        if (!state.timeline || !state.timeline[today]) {
            initializeTimelineData(today);
        }
        const keepDays = 3;
        const dates = Object.keys(state.timeline || {});
        dates.sort();
        if (dates.length > keepDays) {
            const toDelete = dates.slice(0, dates.length - keepDays);
            toDelete.forEach(d => { delete state.timeline[d]; });
        }
    }
});
