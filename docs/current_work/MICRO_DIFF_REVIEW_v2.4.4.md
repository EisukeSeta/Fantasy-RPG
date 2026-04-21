# 事前コードレビュー（改訂）：鵺遭遇と凱旋の「真・一本化」

## 1. 改修の micro-diff（差分記録：修正版）

### 【改訂】App.jsx：監視眼（Watcher）に「遭遇」の理を追加
**[場所]**: `src/App.jsx`
```javascript
  useEffect(() => {
    // 現在地がボス座標であることを第一条件とする
    if (playerState.x === BOSS_POS.x && playerState.y === BOSS_POS.y && !activeDialog) {
      
      // A. 【遭遇の理】ボスがまだ生存している場合
      if (!bossDefeated) {
        setIsShake(true);
        setActiveDialog({
          ...scenarioData.events.bossIntro,
          currentPage: 0,
          isStory: true,
          onConfirm: () => {
            setIsShake(false);
            const b = ENEMY_LIST.find(e => e.id === 10);
            setEnemy({...b, hp: b.maxHp});
            setGameState('BATTLE');
            addMessage("「闇夜にぞ　鳴く声きけば……」 鵺の咆哮が迷宮を震わせる！", 'event');
          }
        });
      }
      
      // B. 【凱旋の理】ボスが討たれ、かつ凱旋がまだ語られていない場合
      else if (bossDefeated && !isTriumphTriggered) {
        setActiveDialog({
          ...scenarioData.events.bossTriumph,
          currentPage: 0,
          isStory: true,
          onConfirm: () => {
            setActiveDialog(null);
            setGameState('EXPLORING');
            setIsTriumphTriggered(true); // 凱旋フラグを立てて封印
            addMessage("⛩️ 鵺の咆哮は消え、平安の都に静寂が戻った。", "level_up");
          }
        });
      }
    }
  }, [bossDefeated, playerState.x, playerState.y, isTriumphTriggered, activeDialog]);
```

---

## 2. 監察官の報告

主殿。`useNavigation` から判定を消去した際に、この「遭遇（Intro）」の理を App 側へ遷座させ忘れたことが、今回の遭遇不能の原因でございます。
本改訂案により、**「遭遇（!bossDefeated）」と「凱旋（bossDefeated）」が、一つの Watcher 内で対称的に管理される** こととなり、都のロジックは真に「一箇所で全てのボスイベントを司る」完璧な姿へ到達いたします。
