document.addEventListener('DOMContentLoaded', function() {
    // アプリケーションの状態
    const state = {
        currentPage: 'home',
        activities: [],
        currentActivity: null,
        dailyTasks: {},
        editMode: false,
        editingItem: null
    };

    // 初期データのロード
    loadData();
    
    // アプリの初期化
    initApp();

    // 現在の日付を設定
    updateCurrentDate();

    // =====================
    // データ管理機能
    // =====================
    
    // 未来の日付を取得する関数（n日後）
    function getFutureDateString(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
    
    // データを初期化する関数
    function initializeData() {
        // 初期データを作成
        const initialActivities = [
            {
                id: generateId(),
                name: 'ホスト',
                purpose: '小遣い稼ぎ、気分転換',
                timeline: 'short-term',
                progress: 0,
                completed: false,
                notes: '',
                kpis: [
                    { text: '毎月50万円の売上', deadline: getFutureDateString(10), completed: false },
                    { text: '常連客5人確保', deadline: getFutureDateString(10), completed: false }
                ],
                phases: ['客層リサーチ', '最適な店舗選び', '接客スキル向上', '常連獲得'],
                dailyTasks: ['LINEで顧客フォロー', '営業日の確認', '自己PRの改善']
            },
            {
                id: generateId(),
                name: '権威性インスタ',
                purpose: '交流',
                timeline: 'short-term',
                progress: 0,
                completed: false,
                kpis: [
                    { text: 'フォロワー1000人', deadline: getFutureDateString(10), completed: false },
                    { text: '週5投稿', deadline: getFutureDateString(10), completed: false },
                    { text: '業界内認知度向上', deadline: getFutureDateString(10), completed: false }
                ],
                phases: ['コンセプト決め', 'プロフィール最適化', 'コンテンツ制作', 'エンゲージメント獲得'],
                dailyTasks: ['ストーリー投稿', '同業者とのDM交流', 'コメント返信']
            },
            // 他の初期アクティビティ...
        ];

        // 初期タスク状態の作成
        const initialDailyTasks = {};
        const today = new Date().toISOString().split('T')[0];
        
        initialActivities.forEach(activity => {
            if (activity.dailyTasks && activity.dailyTasks.length > 0) {
                activity.dailyTasks.forEach(task => {
                    const taskId = generateId();
                    if (!initialDailyTasks[today]) {
                        initialDailyTasks[today] = [];
                    }
                    initialDailyTasks[today].push({
                        id: taskId,
                        activityId: activity.id,
                        activityName: activity.name,
                        name: task,
                        completed: false
                    });
                });
            }
        });

        return {
            activities: initialActivities,
            dailyTasks: initialDailyTasks
        };
    }

    // データをロードする関数
    function loadData() {
        try {
            // ローカルストレージからデータをロード
            const savedActivities = localStorage.getItem('activities');
            const savedDailyTasks = localStorage.getItem('dailyTasks');
            
            if (savedActivities && savedDailyTasks) {
                state.activities = JSON.parse(savedActivities);
                state.dailyTasks = JSON.parse(savedDailyTasks);
            } else {
                // 初期データの作成と保存
                const initialData = initializeData();
                state.activities = initialData.activities;
                state.dailyTasks = initialData.dailyTasks;
                saveData();
            }
        } catch (error) {
            console.error('データのロード中にエラーが発生しました:', error);
            // エラーが発生した場合は初期データをロード
            const initialData = initializeData();
            state.activities = initialData.activities;
            state.dailyTasks = initialData.dailyTasks;
        }
    }

    // データを保存する関数
    function saveData() {
        try {
            localStorage.setItem('activities', JSON.stringify(state.activities));
            localStorage.setItem('dailyTasks', JSON.stringify(state.dailyTasks));
            // 更新日時を更新
            updateLastUpdated();
        } catch (error) {
            console.error('データの保存中にエラーが発生しました:', error);
            alert('データの保存に失敗しました。');
        }
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
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const formattedDate = now.toLocaleDateString('ja-JP', options);
        
        // ホームページの更新日時を更新
        const lastUpdatedElements = document.querySelectorAll('#last-updated-date, #footer-last-updated, #detail-last-updated, #detail-footer-last-updated, #tasks-footer-last-updated');
        lastUpdatedElements.forEach(element => {
            if (element) {
                element.textContent = formattedDate;
            }
        });
    }

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
        
        renderPage(state.currentPage);
        setupEventListeners();
        
        // URLのハッシュをチェックしてスクロール
        setTimeout(checkUrlHashAndScroll, 500);
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
            saveData();
        }
    }

    // ページをレンダリングする関数
    function renderPage(page) {
        state.currentPage = page;
        const appContainer = document.getElementById('app');
        appContainer.innerHTML = '';
        
        let template;
        
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
            default:
                template = document.getElementById('home-template');
                appContainer.appendChild(document.importNode(template.content, true));
                renderHomeData();
                break;
        }
        
        // メインのナビゲーションにイベントリスナーを設定
        setupNavigationListeners();
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
                } else {
                    activity.completed = false;
                }
                
                // UI更新
                const kpiTextElement = kpiItem.querySelector('.detail-item-content');
                kpiTextElement.classList.toggle('completed-kpi', checkbox.checked);
                
                // 進捗バーを更新
                updateProgressDisplay(activity);
                
                // データを保存
                saveData();
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
        }
        
        // 備考欄を更新
        const notesEditor = document.getElementById('notes-editor');
        notesEditor.innerHTML = activity.notes || '';
        
        // 備考欄の保存ボタンのイベントリスナーを設定
        document.getElementById('save-notes-btn').addEventListener('click', () => {
            const notesContent = notesEditor.innerHTML;
            activity.notes = notesContent;
            saveData();
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

    // 進捗表示を更新する関数
    function updateProgressDisplay(activity) {
        const progressBar = document.getElementById('detail-progress-bar');
        const progressPercentage = document.getElementById('detail-progress-percentage');
        
        if (progressBar && progressPercentage) {
            progressBar.style.width = `${activity.progress}%`;
            progressPercentage.textContent = `${activity.progress}%`;
        }
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
                        saveData();
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
                
                if (!activity.dailyTasks) {
                    activity.dailyTasks = [];
                }
                activity.dailyTasks.push(taskText);
                
                // 今日のタスクに追加（タスクが空でない場合）
                if (taskText && taskText.trim() !== '') {
                    const today = getCurrentDate();
                    if (state.dailyTasks[today]) {
                        state.dailyTasks[today].push({
                            id: generateId(),
                            activityId: activity.id,
                            activityName: activity.name,
                            name: taskText,
                            completed: false
                        });
                    }
                }
                break;
                
            default:
                return;
        }
        
        saveData();
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
                <input type="text" class="phase-input" placeholder="フェーズ" value="${phase}" required>
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
        
        // 毎日のタスクが存在する場合のみ処理
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
            // タスクがない場合は空の入力フィールドを追加
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

    // 入力フィールドを追加する関数
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
                <input type="text" class="${type}-input" placeholder="${type === 'phase' ? 'フェーズ' : 'タスク'}" ${type !== 'task' ? 'required' : ''}>
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

    // タスク入力から配列を取得する関数
    function getTasksFromInputs() {
        const tasks = [];
        document.querySelectorAll('.task-input').forEach(input => {
            if (input.value.trim()) {
                tasks.push(input.value.trim());
            }
        });
        return tasks.length > 0 ? tasks : null; // タスクが無ければnullを返す
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
        
        // タスクを取得 (空のタスクは無視)
        const dailyTasks = getTasksFromInputs();
        
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
                    dailyTasks: dailyTasks || [] // タスクが無い場合は空配列
                };
                
                state.activities[activityIndex] = updatedActivity;
                
                // タスクがある場合のみ今日のタスクも更新
                if (dailyTasks && dailyTasks.length > 0) {
                    const today = getCurrentDate();
                    if (state.dailyTasks[today]) {
                        // 古いタスクを削除
                        state.dailyTasks[today] = state.dailyTasks[today].filter(task => task.activityId !== oldActivity.id);
                        
                        // 新しいタスクを追加
                        dailyTasks.forEach(task => {
                            state.dailyTasks[today].push({
                                id: generateId(),
                                activityId: oldActivity.id,
                                activityName: name,
                                name: task,
                                completed: false
                            });
                        });
                    }
                }
                
                saveData();
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
                dailyTasks: dailyTasks || [] // タスクが無い場合は空配列
            };
            
            state.activities.push(newActivity);
            
            // タスクがある場合のみ今日のタスクに追加
            if (dailyTasks && dailyTasks.length > 0) {
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
                        completed: false
                    });
                });
            }
            
            saveData();
            state.currentActivity = newActivity.id;
            renderPage('home');
        }
    }

    // ホーム画面のデータをレンダリングする関数
    function renderHomeData() {
        // 実装内容...
    }

    // 今日のタスク一覧ページをレンダリングする関数
    function renderDailyTasks() {
        // 実装内容...
    }

    // ダッシュボードをレンダリングする関数
    function renderDashboard() {
        // 実装内容...
    }

    // 主要なイベントリスナーを設定する関数
    function setupEventListeners() {
        // ウィンドウのリサイズイベント
        window.addEventListener('resize', function() {
            // 必要に応じてレスポンシブ対応のコード
        });
    }

    // ナビゲーションのイベントリスナーを設定する関数
    function setupNavigationListeners() {
        // 実装内容...
    }
});
