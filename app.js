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
            {
                id: generateId(),
                name: 'ネカマ',
                purpose: 'アカウント育成、小遣い稼ぎ',
                timeline: 'short-term',
                progress: 0,
                kpis: ['毎月30万円の収益', 'リピーター10人確保', 'リスク回避率100%'],
                phases: ['プロフィール設定', '写真収集', 'メッセージング戦略', '収益化'],
                dailyTasks: ['メッセージ確認と返信', 'プロフィール更新', '新規顧客開拓']
            },
            {
                id: generateId(),
                name: 'Berserk',
                purpose: '1億円弱の収益獲得',
                timeline: 'short-term',
                progress: 0,
                kpis: ['年間8000万円の収益', '安定的なキャッシュフロー確立', 'リスク分散'],
                phases: ['市場調査', '戦略策定', '実行計画作成', '運用開始', '収益最大化'],
                dailyTasks: ['市場動向チェック', '収支確認', 'リスク管理']
            },
            {
                id: generateId(),
                name: '嬢向け顧客管理アプリ',
                purpose: '月100万円以上の収入源確立',
                timeline: 'short-term',
                progress: 0,
                kpis: ['ユーザー100人獲得', '月額収益100万円達成', 'アプリ完成度90%以上'],
                phases: ['要件定義', 'UI/UXデザイン', 'バックエンド開発', 'フロントエンド開発', 'テスト運用', '正式リリース'],
                dailyTasks: ['開発作業', 'ユーザーフィードバック収集', '改善点リストアップ']
            },
            {
                id: generateId(),
                name: 'Dear Princess',
                purpose: '小遣い稼ぎ、気分転換',
                timeline: 'short-term',
                progress: 0,
                kpis: [
                    { text: '月収30万円', deadline: getFutureDateString(10) },
                    { text: '常連顧客5人', deadline: getFutureDateString(10) },
                    { text: '自己ブランディング確立', deadline: getFutureDateString(10) }
                ],
                phases: ['コンセプト設計', '集客戦略', 'サービス提供開始', 'リピーター獲得'],
                dailyTasks: ['SNS更新', '顧客対応', 'サービス内容改善']
            },
            {
                id: generateId(),
                name: 'Dolce Prince',
                purpose: 'ゴミ拾いによる臨時収入',
                timeline: 'short-term',
                progress: 0,
                kpis: ['月収50万円', '効率的な回収ルート確立', '継続可能な事業モデル構築'],
                phases: ['エリア調査', '回収手法確立', '販売ルート確保', '事業最適化'],
                dailyTasks: ['ルート確認', '価格変動チェック', '効率分析']
            },
            {
                id: generateId(),
                name: 'N\'s Secret',
                purpose: '人脈拡大、生涯事業',
                timeline: 'short-term',
                progress: 0,
                kpis: ['コアメンバー10人獲得', '月間イベント1回以上', '信頼関係構築'],
                phases: ['コンセプト確立', 'メンバー勧誘', '活動スタート', 'コミュニティ拡大'],
                dailyTasks: ['メンバーとのコミュニケーション', 'イベント企画', '人脈開拓']
            },
            {
                id: generateId(),
                name: '新歓事業',
                purpose: '小遣い稼ぎ、気分転換',
                timeline: 'short-term',
                progress: 0,
                kpis: ['参加者100人獲得', '利益100万円', '人脈拡大'],
                phases: ['企画立案', '会場確保', '広報活動', '実施', '振り返り'],
                dailyTasks: ['広報活動', '参加者フォロー', '運営準備']
            },
            {
                id: generateId(),
                name: '進捗管理ツール開発',
                purpose: '今後の活動全般のため',
                timeline: 'short-term',
                progress: 0,
                kpis: ['全事業の一元管理', '進捗可視化100%', '使いやすさ向上'],
                phases: ['要件定義', 'UI設計', '開発', 'テスト', 'リリース'],
                dailyTasks: ['機能開発', 'UI改善', 'データ整理']
            },
            {
                id: generateId(),
                name: 'こけし組合',
                purpose: '仲間集め、組織拡大、生涯事業',
                timeline: 'medium-term',
                progress: 0,
                kpis: ['メンバー20人獲得', '月次ミーティング実施率100%', '収益事業2つ立ち上げ'],
                phases: ['コンセプト策定', 'メンバー募集', '組織構築', '活動開始', '事業多角化'],
                dailyTasks: ['メンバーコミュニケーション', '組織構造検討', '活動計画策定']
            },
            {
                id: generateId(),
                name: 'Princess Lens',
                purpose: '月1000万円以上の収入源確立',
                timeline: 'medium-term',
                progress: 0,
                kpis: ['月収1000万円', '顧客満足度90%以上', 'ブランド認知度向上'],
                phases: ['市場調査', 'ビジネスモデル策定', '初期投資', '事業開始', 'スケール化'],
                dailyTasks: ['市場分析', '競合調査', '事業計画見直し', '収益モデル検討']
            },
            {
                id: generateId(),
                name: '合法エロサイト運営',
                purpose: '挑戦、小遣い稼ぎ',
                timeline: 'medium-term',
                progress: 0,
                kpis: ['月間PV10万達成', '月収50万円', 'コンテンツ100記事公開'],
                phases: ['サイト設計', 'コンテンツ制作', 'SEO対策', '収益化', 'スケール'],
                dailyTasks: ['コンテンツ作成', 'SEO確認', 'アクセス解析', '収益最適化']
            },
            {
                id: generateId(),
                name: '男女平等サロン',
                purpose: '小遣い稼ぎ、お遊び',
                timeline: 'medium-term',
                progress: 0,
                kpis: ['会員50人獲得', '月収100万円', 'イベント満足度90%以上'],
                phases: ['コンセプト策定', '場所確保', 'メンバー募集', 'イベント企画', '運営開始'],
                dailyTasks: ['メンバー対応', 'イベント企画', '集客活動', '運営改善']
            },
            {
                id: generateId(),
                name: 'Tinder模倣事業',
                purpose: '経験、挑戦',
                timeline: 'long-term',
                progress: 0,
                kpis: ['ユーザー1000人獲得', 'マッチング成立数100/日', '収益化モデル確立'],
                phases: ['市場調査', 'アプリ設計', '開発', 'テスト', 'マーケティング', 'ローンチ'],
                dailyTasks: ['競合分析', '機能設計', '開発進捗確認', 'マーケティング戦略検討']
            },
            {
                id: generateId(),
                name: '高級焼肉事業',
                purpose: '挑戦、思い出作り',
                timeline: 'long-term',
                progress: 0,
                kpis: ['月商1000万円', '客単価2万円', 'リピート率30%'],
                phases: ['コンセプト策定', '立地調査', 'メニュー開発', '内装設計', '人材確保', 'オープン'],
                dailyTasks: ['市場調査', '競合店分析', '立地検討', 'メニュー考案']
            },
            {
                id: generateId(),
                name: 'ブランドお茶ボトル事業',
                purpose: '挑戦、思い出作り',
                timeline: 'long-term',
                progress: 0,
                kpis: ['月間販売数1000本', 'SNSフォロワー5000人獲得', '小売店舗30店舗での取り扱い'],
                phases: ['商品開発', 'ブランディング', 'パッケージデザイン', '生産体制構築', '販路開拓', '販売開始'],
                dailyTasks: ['競合リサーチ', 'デザイン検討', 'パートナー候補調査', 'ブランドコンセプト検討']
            },
            {
                id: generateId(),
                name: '声カテ配信',
                purpose: '気分転換',
                timeline: 'long-term',
                progress: 0,
                kpis: ['チャンネル登録者1000人', '月間再生数5000回', 'ファン獲得10人'],
                phases: ['コンテンツ企画', '機材準備', '配信テスト', '本格配信開始', 'コミュニティ形成'],
                dailyTasks: ['コンテンツアイデア出し', '競合配信者研究', '機材選定', '配信テスト']
            },
            {
                id: generateId(),
                name: '完全ネカマLLM',
                purpose: '挑戦、研究開発',
                timeline: 'long-term',
                progress: 0,
                kpis: ['AIモデル完成度90%', 'テストユーザー満足度80%', '商用化可能性の確立'],
                phases: ['要件定義', 'データ収集', 'モデル構築', '学習', 'テスト', '最適化', 'リリース'],
                dailyTasks: ['AI研究', 'データ収集方法検討', 'モデル構造設計', '実装計画策定']
            }
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
                        completed: false,
                        isRecurring: true // タスクが毎日のタスクかどうかを示すフラグ
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
                
                // isRecurringフラグがない古いタスクに対してフラグを追加
                const today = getCurrentDate();
                if (state.dailyTasks[today]) {
                    state.dailyTasks[today].forEach(task => {
                        if (task.isRecurring === undefined) {
                            task.isRecurring = true;
                        }
                    });
                }
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
        
        // 今日のタスクページとKPI一覧ページの日付を更新
        const currentDateElements = document.querySelectorAll('#current-date, #kpi-current-date');
        currentDateElements.forEach(element => {
            if (element) {
                element.textContent = formattedDate;
            }
        });
    }

    // 最終更新日時を更新
    function updateLastUpdated() {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const formattedDate = now.toLocaleDateString('ja-JP', options);
        
        // 各ページの更新日時を更新
        const lastUpdatedElements = document.querySelectorAll('#last-updated-date, #footer-last-updated, #detail-last-updated, #detail-footer-last-updated, #tasks-footer-last-updated, #kpi-footer-last-updated');
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
            default:
                template = document.getElementById('home-template');
                appContainer.appendChild(document.importNode(template.content, true));
                renderHomeData();
                break;
        }
        
        // メインのナビゲーションにイベントリスナーを設定
        setupNavigationListeners();
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
                    saveData();
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
            saveData();
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

    // KPI期限日からの残り日数を計算する関数
    function getDaysRemaining(deadlineDate) {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // 今日の0時0分に設定
        
        const deadline = new Date(deadlineDate);
        deadline.setHours(0, 0, 0, 0); // 期限日の0時0分に設定
        
        const diffMs = deadline - now;
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        return days;
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
                        saveData();
                        
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

    // KPI一覧ページをレンダリングする関数
    function renderKpiList() {
        updateCurrentDate();
        updateLastUpdated();
        
        // 全事業のKPIを取得して一覧にする
        const allKpis = [];
        state.activities.forEach(activity => {
            if (Array.isArray(activity.kpis) && activity.kpis.length > 0) {
                activity.kpis.forEach(kpi => {
                    // KPIがオブジェクトかどうかを確認
                    if (typeof kpi === 'object' && kpi !== null) {
                        allKpis.push({
                            id: generateId(), // KPI一覧用の一意のID
                            activityId: activity.id,
                            activityName: activity.name,
                            text: kpi.text,
                            deadline: kpi.deadline || getFutureDateString(10),
                            completed: kpi.completed || false,
                            kpiIndex: activity.kpis.indexOf(kpi) // 元の事業内でのKPIのインデックス
                        });
                    } else if (typeof kpi === 'string') {
                        // 文字列の場合（古いフォーマット）
                        allKpis.push({
                            id: generateId(),
                            activityId: activity.id,
                            activityName: activity.name,
                            text: kpi,
                            deadline: getFutureDateString(10),
                            completed: false,
                            kpiIndex: activity.kpis.indexOf(kpi)
                        });
                    }
                });
            }
        });
        
        // 期限が近い順にソート（未達成を優先）
        allKpis.sort((a, b) => {
            // 未達成のKPIを優先
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            // 期限切れを最優先
            const daysRemainingA = getDaysRemaining(a.deadline);
            const daysRemainingB = getDaysRemaining(b.deadline);
            
            if (daysRemainingA < 0 && daysRemainingB >= 0) return -1;
            if (daysRemainingA >= 0 && daysRemainingB < 0) return 1;
            
            // 期限が近い順にソート
            return daysRemainingA - daysRemainingB;
        });
        
        // KPI一覧コンテナを取得
        const kpiContainer = document.getElementById('kpi-list-container');
        kpiContainer.innerHTML = '';
        
        if (allKpis.length === 0) {
            kpiContainer.innerHTML = '<div class="empty-list-message">KPIはありません</div>';
            updateKpiCompletion(0, 0);
            return;
        }
        
        // 3列のグリッドコンテナを作成
        const gridContainer = document.createElement('div');
        gridContainer.className = 'kpi-grid';
        kpiContainer.appendChild(gridContainer);
        
        // 各KPIをグリッドに追加
        allKpis.forEach(kpi => {
            const kpiCard = document.createElement('div');
            kpiCard.className = `kpi-card ${kpi.completed ? 'kpi-completed' : ''}`;
            kpiCard.dataset.id = kpi.id;
            
            // 残り日数を計算
            const daysRemaining = getDaysRemaining(kpi.deadline);
            let timeStatus, timeClass;
            
            if (daysRemaining < 0) {
                timeStatus = '期限切れ';
                timeClass = 'expired';
            } else if (daysRemaining <= 7) {
                timeStatus = `残り ${daysRemaining}日`;
                timeClass = 'warning';
            } else {
                timeStatus = `残り ${daysRemaining}日`;
                timeClass = 'normal';
            }
            
            // 期限日を表示用にフォーマット
            const deadlineDate = new Date(kpi.deadline);
            const formattedDate = `${deadlineDate.getFullYear()}/${(deadlineDate.getMonth() + 1).toString().padStart(2, '0')}/${deadlineDate.getDate().toString().padStart(2, '0')}`;
            
            kpiCard.innerHTML = `
                <div class="kpi-card-header">
                    <div class="kpi-activity-name">${kpi.activityName}</div>
                    <div class="kpi-deadline ${timeClass}">${timeStatus}</div>
                </div>
                <div class="kpi-card-content">
                    <div class="kpi-checkbox-wrapper">
                        <input type="checkbox" class="kpi-checkbox" ${kpi.completed ? 'checked' : ''}>
                    </div>
                    <div class="kpi-text ${kpi.completed ? 'completed-kpi' : ''}">${kpi.text}</div>
                </div>
                <div class="kpi-card-footer">
                    <div class="kpi-date">期限: ${formattedDate}</div>
                    <button class="kpi-card-view-btn" title="事業詳細を見る">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
            `;
            
            gridContainer.appendChild(kpiCard);
            
            // チェックボックスのイベントリスナーを設定
            const checkbox = kpiCard.querySelector('.kpi-checkbox');
            checkbox.addEventListener('change', () => {
                // KPIの完了状態を更新
                const activity = getActivityById(kpi.activityId);
                if (activity && activity.kpis[kpi.kpiIndex]) {
                    // 事業内のKPIの完了状態を更新
                    activity.kpis[kpi.kpiIndex].completed = checkbox.checked;
                    
                    // UI更新
                    kpi.completed = checkbox.checked;
                    kpiCard.classList.toggle('kpi-completed', checkbox.checked);
                    kpiCard.querySelector('.kpi-text').classList.toggle('completed-kpi', checkbox.checked);
                    
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
                    saveData();
                    
                    // KPI完了状況を更新
                    updateKpiCompletion();
                    
                    // KPIリストを再ソート
                    renderKpiList();
                }
            });
            
            // 事業詳細ボタンのイベントリスナーを設定
            const viewButton = kpiCard.querySelector('.kpi-card-view-btn');
            viewButton.addEventListener('click', () => {
                state.currentActivity = kpi.activityId;
                renderPage('activity-detail');
            });
        });
        
        // KPI完了状況を更新
        updateKpiCompletion();
        
        // フィルターボタンのイベントリスナーを設定
        const filterButtons = document.querySelectorAll('.kpi-filter .filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const filter = button.dataset.filter;
                filterKpis(filter);
            });
        });
    }
    
    // KPI完了状況を更新する関数
    function updateKpiCompletion() {
        // 全KPIのカウントを計算
        let totalKpis = 0;
        let completedKpis = 0;
        
        state.activities.forEach(activity => {
            if (Array.isArray(activity.kpis)) {
                totalKpis += activity.kpis.length;
                
                activity.kpis.forEach(kpi => {
                    if (typeof kpi === 'object' && kpi !== null && kpi.completed) {
                        completedKpis++;
                    }
                });
            }
        });
        
        // カウントを更新
        const totalKpiCountElem = document.getElementById('total-kpi-count');
        const kpiCompletedCountElem = document.getElementById('kpi-completed-count');
        
        if (totalKpiCountElem) totalKpiCountElem.textContent = totalKpis;
        if (kpiCompletedCountElem) kpiCompletedCountElem.textContent = completedKpis;
        
        // 進捗バーを更新
        const completionPercentage = totalKpis > 0 ? (completedKpis / totalKpis) * 100 : 0;
        const progressBar = document.getElementById('kpi-completion-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${completionPercentage}%`;
        }
    }
    
    // KPIをフィルタリングする関数
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
            if (Array.isArray(activity.kpis)) {
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
            
            saveData();
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
                saveData();
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
            saveData();
            
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
            saveData();
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
            
            saveData();
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
                
                // ホームページでのセクションジャンプ処理
                if (state.currentPage === 'home' && page !== 'daily-tasks' && page !== 'kpi-list' && page !== 'activity-form' && page !== 'dashboard') {
                    // ページ内のセクションにスクロール
                    const section = document.getElementById(page);
                    if (section) {
                        // 目次リンクのアクティブ状態を更新
                        navLinks.forEach(l => l.classList.remove('active'));
                        this.classList.add('active');
                        
                        // URLにハッシュを追加してブックマークしやすくする
                        window.history.pushState(null, null, `#${page}`);
                        
                        // スムーズにスクロール
                        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        return;
                    }
                }
                
                // 同じページの場合は何もしない（ホームページのセクションジャンプを除く）
                if (page === state.currentPage) return;
                
                // アクティブなリンクを更新
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // ページ遷移
                renderPage(page);
            });
        });
    }
};
