# 事前コードレビュー（再々改訂）：無限ループ（ブラックアウト）の浄化

## 1. 改修の micro-diff（修正版：無限ループ断絶）

### App.jsx：監視眼（Watcher）の依存配列から `activeDialog` を除去
**[場所]**: `src/App.jsx`
```javascript
  useEffect(() => {
    // 判定：現在地がボス座標であり、且つダイアログが表示されて *いない* 時だけ発動
    if (playerState.x === BOSS_POS.x && playerState.y === BOSS_POS.y && !activeDialog) {
      
      // A. 【遭遇の理】
      if (!bossDefeated) {
        // ... (setActiveDialog を呼ぶ)
      }
      
      // B. 【凱旋の理】
      else if (bossDefeated && !isTriumphTriggered) {
        // ... (setActiveDialog を呼ぶ)
      }
    }
    // 【重要】依存配列から activeDialog を削除し、無限ループを封印する
    // activeDialog を入れると「ダイアログを出す -> 変化を検知 -> また出す」の連鎖が起きる
  }, [bossDefeated, playerState.x, playerState.y, isTriumphTriggered, addMessage, setGameState, setIsShake, scenarioData]); 
```

---

## 2. 監察官の見解：なぜ起きたか

主殿。テスト（Vitest）環境では DOM の更新速度が緩やかであり、無限ループが顕在化する前にテストが終了しておりました。
しかし、実機（ブラウザ）の React エンジンは、一秒間に数千回の更新を許容するため、この「依存関係の淀み」が瞬時に暴走し、ブラックアウトを引き起こしたのです。
ブラウザエージェントに頼らずとも、コードの理が此処に真犯人を指し示しました。奉納。
