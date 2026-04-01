import { useState, useEffect, useRef, useCallback } from 'react';
import { generateMap, MAP_WIDTH, MAP_HEIGHT, DIRECTIONS, DIR_DELTAS } from './data/mapData';
import { WireframeView } from './components/WireframeView';
import { ENEMY_LIST, getRandomEnemy, calculateHitAndDamage } from './data/enemyData';
import { SPELLS } from './data/magicData';
import SoundEngine from './utils/SoundEngine';

// S字カーブの累積必要経験値テーブル（Lv2へは100程度で到達するように調整）
// 成長曲線：15分程度のプレイでLv.5前後に到達できるよう調整
const getRequiredExp = (lv) => {
  if (lv <= 1) return 0;
  if (lv === 2) return 100;
  if (lv === 3) return 250;
  if (lv === 4) return 500;
  if (lv === 5) return 900;
  if (lv >= 50) return 9999999;
  
  // 以降はS字カーブで緩やかに上昇
  const x = (lv - 1) / 49;
  const sigmoid = 1 / (1 + Math.exp(-6 * (x - 0.5)));
  return Math.floor(20000 * sigmoid);
};

// マップ内の定数座標
const BOSS_POS = { x: 8, y: 6 };
const HEAL_SPOTS = [{x:1, y:1}, {x:8, y:1}, {x:1, y:6}];

function App() {
  const [gameState, setGameState] = useState('EXPLORING'); // EXPLORING, BATTLE, DEAD, CLEAR
  const [bossDefeated, setBossDefeated] = useState(false); 
  
  // デバッグモードの判定 (?debug=1)
  const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
  const isForceMobile = new URLSearchParams(window.location.search).get('mobile') === '1';
  const [debugEncounter, setDebugEncounter] = useState(true);

  // ステータス操作（デバッグ用）
  const debugHeal = () => {
    setParty(prev => prev.map(m => ({ ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' })));
    addMessage('【DEBUG】全員を全快させました。');
  };
  
  const debugKill = () => {
    setParty(prev => prev.map(m => ({ ...m, hp: 0, status: '討死' })));
    addMessage('【DEBUG】全員を討死状態にしました。');
  };

  // PCでの強制スマホモード用のクラス管理
  useEffect(() => {
    if (isForceMobile) {
      document.body.classList.add('is-mobile-body');
    } else {
      document.body.classList.remove('is-mobile-body');
    }
    return () => document.body.classList.remove('is-mobile-body');
  }, [isForceMobile]);

  const debugEnemyKill = () => {
    if (enemy) {
      setEnemy(prev => ({ ...prev, hp: 1 }));
      addMessage('【DEBUG】敵の生命を極限まで削りました。');
    }
  };
  
  const debugWarp = (tx, ty) => {
    const target = { x: parseInt(tx), y: parseInt(ty), dir: DIRECTIONS.N };
    if (isNaN(target.x) || isNaN(target.y)) return;
    setPlayerState(target);
    addMessage(`【DEBUG】(${target.x}, ${target.y}) へ跳躍しました。`);
  };

  const [activeDialog, setActiveDialog] = useState({
    title: '平安魔道伝 羅生門編 ― 序章',
    pages: [
      `雨が降っていた。\n京の南端にそびえる羅生門は、かつての威容を喪失し、崩れ落ちた瓦と柱が、まるで巨大な獣の死骸のように横たわっている。`,
      `その雨だれの下、一人の下人が身を丸め、暗闇の中から現れた三つの人影を見て嘲笑を浮かべた。\n「……また、阿呆が来よったわ」`,
      `一人は, 茨木童子の腕を背負いし武者、渡辺綱。\n一人は、狐の影を纏いし陰陽師、安倍晴明。\n一人は、空虚な微笑を浮かべる比丘尼。`,
      `羅生門の奥には、空間そのものがひび割れたような『穴』が開いていた。そこは死人すら寄り付かぬ冥府の底。\n三人は振り返ることなく、黒煙の渦巻く奈落へと足を踏み入れた……。`
    ],
    currentPage: 0
  }); // { title: string, pages: string[], currentPage: 0, onConfirm?: func, showChoices?: boolean }
  const [isAutoBattle, setIsAutoBattle] = useState(() => {
    if (typeof window !== 'undefined') {
      return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    }
    return false;
  });
  const [showMap, setShowMap] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [messages, setMessages] = useState(['【御神木の社】から冒険が始まった...']);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // ログが更新されたら自動的に最下部までスクロール
  useEffect(() => {
    const logEl = document.getElementById('mobile-log-display');
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
  }, [messages, showMap, showStatus]);


  const showDialog = useCallback((title, contents, onConfirm = null, showChoices = false) => {
    const pages = Array.isArray(contents) ? contents : [contents];
    setActiveDialog({ title, pages, currentPage: 0, onConfirm, showChoices });
  }, []);
  
  // マップと位置データ
  const [mapData, setMapData] = useState(() => {
    const m = generateMap();
    m[1][1].visited = true;
    return m;
  });
  const [playerState, setPlayerState] = useState({ x: 1, y: 1, dir: DIRECTIONS.S });
  
  // 3人のパーティメンバー
  const [party, setParty] = useState([
    { id: 'Tsu', name: '渡辺 綱', job: '武者', jobKey: 'SAMURAI', expName: '武者の魂', lv: 1, exp: 0, icon: '⚔️', hp: 30, maxHp: 30, mp: 0, maxMp: 0, ac: 4, minDmg: 8, maxDmg: 15, status: '平安' },
    { id: 'Sei', name: '安倍 晴明', job: '陰陽師', jobKey: 'ONMYOJI', expName: '式神の守', lv: 1, exp: 0, icon: '☯️', hp: 15, maxHp: 15, mp: 10, maxMp: 10, ac: 10, minDmg: 1, maxDmg: 4, status: '平安' },
    { id: 'Bik', name: '八百比丘尼', job: '尼僧', jobKey: 'NISOU', expName: '法力', lv: 1, exp: 0, icon: '📿', hp: 20, maxHp: 20, mp: 8, maxMp: 8, ac: 8, minDmg: 2, maxDmg: 6, status: '平安' }
  ]);

  const [activeBattler, setActiveBattler] = useState(0); 
  const [enemy, setEnemy] = useState(null);
  const [showSpells, setShowSpells] = useState(null); 

  const addMessage = useCallback((msg) => {
    setMessages(prev => {
      const newMsgs = [...prev, msg];
      return newMsgs.slice(Math.max(newMsgs.length - 30, 0));
    });
  }, []);

  const playerStateRef = useRef(playerState);
  useEffect(() => { playerStateRef.current = playerState; }, [playerState]);

  const mapDataRef = useRef(mapData);
  useEffect(() => { mapDataRef.current = mapData; }, [mapData]);

  const [hasReadScroll, setHasReadScroll] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);

  // 音響エンジンの状態連動
  useEffect(() => {
    SoundEngine.transitionTo(gameState);
  }, [gameState]);

  useEffect(() => {
    SoundEngine.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  // ダイアログの「読み終える」または遷移時に音声を初期化（ブラウザポリシー対応）
  const initAudio = useCallback(() => {
    SoundEngine.init();
    SoundEngine.setVolume(volume);
    SoundEngine.transitionTo(gameState);
  }, [gameState, volume]);

  const checkOminousPresence = useCallback((x, y) => {
    if (bossDefeated) return;
    const dist = Math.abs(x - BOSS_POS.x) + Math.abs(y - BOSS_POS.y);
    if (dist <= 5) {
      addMessage('妖気が強まっている。強力な魔物が近いようだ。');
    }
  }, [bossDefeated, addMessage]);

  // 出口の確認
  const checkExit = useCallback((x, y) => {
    if (bossDefeated && x === BOSS_POS.x && y === BOSS_POS.y) {
      showDialog(
          '迷宮の出口', 
          '魔物の邪気は消え、先へ進む出口が開いている。この階層を抜けますか？',
          () => setGameState('CLEAR'),
          true
      );
    }
  }, [bossDefeated, showDialog]);

  // 立て札（しるべ）のチェック
  const checkSignboard = useCallback((newX, newY, oldX, oldY) => {
    const DEBUG_ENTRANCE_POS = { x: 1, y: 0 }; // 朱雀門（開始地点の隣）
    const ENTRANCE_POS = { x: 1, y: 2 };       // 御神木の隣
    const MISSION_POS = { x: 1, y: 3 };        // 鵺の使命

    const isEntering = (newX !== oldX || newY !== oldY);
    if (!isEntering) return;

    if (newX === 0 && newY === 0) {
       showDialog(
         '黄泉の井戸',
         [
           "「……冷たく澱んだ水が、無機質な音を立てて湧き出している。ここが、あの世とこの世の境目か……。」",
           "「……御身の時は、まだ尽きてはおらぬ。井戸の底から聞こえる無数の囁きを振り切り、光の差す方（1,1）へ急げ……。」"
         ]
       );
    } else if (newX === DEBUG_ENTRANCE_POS.x && newY === DEBUG_ENTRANCE_POS.y) {
      showDialog(
        '朱雀門の立て札',
        [
          "「ここより北、都の深部へと至る道なり。鵺の咆哮が響く夜は、朱雀門を固く閉ざし、人々の往来を禁ず……。」",
          "「……もし迷いしならば、南（1,1）の御神木のもとへ戻り、身を清めるがよい。神格の加護が武運を助けん……。」"
        ]
      );
    } else if (newX === ENTRANCE_POS.x && newY === ENTRANCE_POS.y) {
      showDialog(
        '御神木の立て札',
        [
          "「これより先は魔道。都の安寧を願うならば、一歩も引くことなかれ。迷宮に蔓延る妖気を払い、光を呼び戻すのだ……。」",
          "「……社の加護が必要ならば、いつでもここ（1,1）へ戻るがよい。神仏の慈悲は常に其方らと共にある。」"
        ]
      );
    } else if (newX === MISSION_POS.x && newY === MISSION_POS.y) {
      showDialog(
        '朽ちかけた立て札',
        [
          "「……ここを通りし勇猛なる者に告ぐ。平安の都は今、未曾有の闇に覆われ、帝の命も風前の灯火。薬や祈祷をもってしても、怨念の核は調伏できぬ。」",
          "「頼政公の命を受けし者よ。迷宮の深部、都の北東に座す『鵺』を調伏せよ。都の安寧は此方の双肩に掛かっておる。迷わず進め……。」"
        ]
      );
      if (!hasReadScroll) {
        setHasReadScroll(true);
        addMessage('使命：迷宮の主「鵺」を調伏せよ。');
      }
    }
  }, [hasReadScroll, showDialog, addMessage]);

  // 回復地点のチェック (計3箇所: 1,1 / 8,1 / 1,6)
  const checkHealSpot = useCallback((x, y) => {
    const isHeal = HEAL_SPOTS.some(s => s.x === x && s.y === y);
    if (isHeal) {
      setParty(prev => prev.map(m => {
        if (m.status === '討死') {
          addMessage(`【神仏の慈悲】${m.name} が黄泉の淵から呼び戻された！`);
        }
        return { ...m, hp: m.maxHp, mp: m.maxMp, status: '平安' };
      }));
      addMessage('神社の結界にて加護を得、生命の力が満たされた！');
    }
  }, [addMessage]);

  // 移動処理の共通化 (キー入力とモバイルボタンの両方で使用)
  const processMove = useCallback((moveType) => {
    // ダイアログ表示中や戦闘中、死亡時は移動入力を完全に拒否
    if (activeDialog || gameState !== 'EXPLORING') return;

    const current = playerStateRef.current;
    let newDir = current.dir;
    let newX = current.x;
    let newY = current.y;
    let hasMoved = false;

    if (moveType === 'TURN_LEFT') {
      newDir = (current.dir + 3) % 4;
    } else if (moveType === 'TURN_RIGHT') {
      newDir = (current.dir + 1) % 4;
    } else if (moveType === 'FORWARD' || moveType === 'BACKWARD') {
      const cell = mapDataRef.current[current.y][current.x];
      const moveDir = moveType === 'FORWARD' ? current.dir : (current.dir + 2) % 4;
      const canMove = 
        (moveDir === DIRECTIONS.N && !cell.n) ||
        (moveDir === DIRECTIONS.E && !cell.e) ||
        (moveDir === DIRECTIONS.S && !cell.s) ||
        (moveDir === DIRECTIONS.W && !cell.w);
      if (canMove) {
        newX += DIR_DELTAS[moveDir].dx;
        newY += DIR_DELTAS[moveDir].dy;
        hasMoved = true;
      }
    }

    if (newX !== current.x || newY !== current.y || newDir !== current.dir) {
      setPlayerState({ x: newX, y: newY, dir: newDir });
      checkHealSpot(newX, newY);
      checkOminousPresence(newX, newY);
      checkExit(newX, newY);
      checkSignboard(newX, newY, current.x, current.y);
      if (!mapDataRef.current[newY][newX].visited) {
        setMapData(prevMap => {
           const newMap = [...prevMap];
           newMap[newY] = [...newMap[newY]]; newMap[newY][newX] = { ...newMap[newY][newX], visited: true };
           return newMap;
        });
      }
    }

    if (hasMoved) {
      // ボス位置に到達
      if (!bossDefeated && newX === BOSS_POS.x && newY === BOSS_POS.y) {
          const boss = ENEMY_LIST.find(e => e.id === 10); // 鵺
          setEnemy({ ...boss, hp: boss.maxHp });
          setGameState('BATTLE');
          addMessage(`【宿敵】${boss.name} が咆哮を上げる！決戦だ！`);
          return;
      }

      // エンカウント判定 (デバッグモードで無効化可能)
      const encounterChance = Math.random();
      if (debugEncounter && encounterChance < 0.15) {
        const totalLv = party.reduce((sum, m) => sum + m.lv, 0);
        const newEnemy = getRandomEnemy(totalLv);
        setEnemy(newEnemy);
        setGameState('BATTLE');
        setActiveBattler(0);
        addMessage(`闇から ${newEnemy.name} (Lv${newEnemy.lv}) があらわれた！`);
      }
    }
  }, [activeDialog, gameState, bossDefeated, party, addMessage, checkHealSpot, checkOminousPresence, checkExit, checkSignboard, debugEncounter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      let moveType = null;
      switch (e.key) {
        case 'w': case 'W': case 'ArrowUp':    moveType = 'FORWARD'; break;
        case 's': case 'S': case 'ArrowDown':  moveType = 'BACKWARD'; break;
        case 'a': case 'A': case 'ArrowLeft':  moveType = 'TURN_LEFT'; break;
        case 'd': case 'D': case 'ArrowRight': moveType = 'TURN_RIGHT'; break;
        default: return;
      }
      processMove(moveType);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processMove]);

  // レベルアップ処理
  const handleLevelUp = useCallback((member) => {
    let m = { ...member };
    while (m.exp >= getRequiredExp(m.lv + 1) && m.lv < 50) {
      m.lv += 1;
      const hpGain = (m.jobKey === 'SAMURAI' ? 8 : m.jobKey === 'NISOU' ? 5 : 3) + Math.floor(Math.random() * 5 - 2);
      // 武者(SAMURAI)もレベルアップでマナが覚醒する設計
      const mpGain = (m.jobKey === 'ONMYOJI' ? 6 : m.jobKey === 'NISOU' ? 4 : 2) + Math.floor(Math.random() * 3 - 1);
      m.maxHp += Math.max(1, hpGain);
      m.maxMp += Math.max(0, mpGain);
      // 火力の成長
      if (m.jobKey === 'SAMURAI') {
          m.minDmg += 2; m.maxDmg += 4;
          m.ac -= 1;
      } else if (m.jobKey === 'ONMYOJI') {
          m.minDmg += 1; m.maxDmg += 2;
          if (m.lv % 2 === 0) m.ac -= 1;
      } else if (m.jobKey === 'NISOU') {
          m.minDmg += 1; m.maxDmg += 1;
          if (m.lv % 3 === 0) m.ac -= 1;
      }
      
      addMessage(`${m.name} は階級【Lv${m.lv}】に上がった！`);
      if (m.jobKey === 'SAMURAI' && m.maxMp > 0 && m.lv === 2) {
          addMessage(`${m.name} は己のマナに目覚め、奥義の端緒を掴んだ！`);
      }
    }
    m.hp = m.maxHp;
    m.mp = m.maxMp;
    return m;
  }, [addMessage]);

  // --- 復活（黄泉還り）処理 ---
  const handleResurrect = useCallback(() => {
    // 1. 座標を「黄泉の井戸 (0,0)」へリセット
    setPlayerState({ x: 0, y: 0, dir: DIRECTIONS.E });
    
    // 2. 忘却：全てのマップのVisitedフラグをリセット
    setMapData(prev => prev.map(row => row.map(cell => ({ ...cell, visited: false }))));
    
    // 3. 衰弱：HP/MPを1桁、経験値をリセット
    setParty(prev => prev.map(m => {
        const baseExp = getRequiredExp(m.lv);
        return {
            ...m,
            hp: 3 + Math.floor(Math.random() * 6), // 3-8
            mp: Math.min(m.maxMp, 1 + Math.floor(Math.random() * 3)), // 1-3
            exp: baseExp,
            status: '平安'
        };
    }));

    setGameState('EXPLORING');
    setEnemy(null);
    setMessages(['黄泉の井戸の淵から、泥にまみれて這い上がった...。']);
    addMessage('【忘却】地図の記憶は失われ、生命の灯火も風前の灯だ。');
  }, [addMessage]);

  // バトル終了処理
  const endBattle = useCallback((won) => {
    if (won) {
        // 魔物の断末魔を再生
        SoundEngine.playMonsterDeath();
        addMessage(`${enemy.name} を撃破した！`);
        // ボス勝利フラグ
        if (enemy.isBoss && enemy.id === 10) {
          setBossDefeated(true);
          addMessage('魔物の気配が消え、迷路の奥に出口が現れた！');
          showDialog(
            '冥府の理',
            [
              `「……お前さんたち。何を持って帰ってきた？ 勝利か、それとも……」\n奈落から這い上がってきた三人の姿に、羅生門の下人は凍りついたように立ち上がり、後退りをした。`,
              `それは帝を病に臥せさせた鵺など比較にならない、根源的な恐怖。\n渡辺綱、安倍晴明、八百比丘尼。新たな『冥府の王』たちが今、都を冷たく見下ろしている……。`
            ]
          );
        }
        // 経験値分配
        setParty(prev => prev.map(m => {
            const gain = Math.floor(enemy.exp * (enemy.expShare[m.jobKey.toLowerCase()] || 0.3));
            addMessage(`${m.name} は ${gain} の${m.expName}を得た。`);
            let newM = { ...m, exp: m.exp + gain };
            if (newM.exp >= getRequiredExp(newM.lv + 1)) {
                return handleLevelUp(newM);
            }
            return newM;
        }));
        setEnemy(null);
        setGameState('EXPLORING');
    } else {
        setGameState('DEAD');
        addMessage('魔物討伐隊は、闇に飲まれてしまった...');
        showDialog(
            '黄泉の番人との契り',
            [
              `「……クカカ、また来たか。地上の未練が断ち切れぬか。」\n暗闇の中で、骨を噛み砕くような声が響く。`,
              `「だが、無償では戻さぬ。これまでの記憶と、その瑞々しい生命の精髄……半分、置いてゆけ。」\n現世へ戻り、再び迷宮に挑みますか？（※地図と経験の一部が失われます）`
            ],
            () => handleResurrect(),
            true // 選択肢（はい・いいえ）を表示
        );
    }
    setActiveBattler(0);
    setShowSpells(null);
  }, [enemy, addMessage, showDialog, handleLevelUp, handleResurrect]);

  const processEnemyTurn = useCallback((currentParty, currentEnemy) => {
      if (!currentEnemy) return;
      const aliveMembers = currentParty.map((m, i) => ({ ...m, originalIndex: i })).filter(m => m.hp > 0);
      if (aliveMembers.length === 0) {
          endBattle(false);
          return;
      }
      const target = Math.floor(Math.random() * aliveMembers.length);
      const targetMember = aliveMembers[target];
      const eAttack = calculateHitAndDamage(currentEnemy.ac, currentEnemy.minDmg, currentEnemy.maxDmg, targetMember.ac);
      
      let newParty = [...currentParty];
      if (eAttack.hit) {
        addMessage(`${currentEnemy.name} の攻撃! ${targetMember.name} に ${eAttack.damage} の痛手!`);
        const newHp = Math.max(0, targetMember.hp - eAttack.damage);
        newParty[targetMember.originalIndex] = { ...targetMember, hp: newHp, status: newHp === 0 ? '討死' : targetMember.status };
      } else {
        addMessage(`${currentEnemy.name} の攻撃を華麗に受け流した!`);
      }

      if (newParty.every(m => m.hp === 0)) {
          setParty(newParty);
          endBattle(false);
      } else {
          setParty(newParty);
          // 最初から生きている人を探す
          const nextAlive = newParty.findIndex(m => m.hp > 0);
          setActiveBattler(nextAlive !== -1 ? nextAlive : 0);
      }
  }, [endBattle, addMessage]);

  // 逃げるアクション
  const handleRun = useCallback(() => {
    if (gameState !== 'BATTLE' || !enemy) return;
    // ボス（鵺など）からは逃げにくい、または逃げられない設計
    const baseChance = enemy.isBoss ? 0.2 : 0.5;
    const avgLv = party.reduce((sum, m) => sum + m.lv, 0) / 3;
    const runChance = Math.min(0.9, Math.max(0.1, baseChance + (avgLv - enemy.lv) * 0.1));
    
    if (Math.random() < runChance) {
        addMessage('脱兎の如く逃げ出した！');
        setEnemy(null);
        setGameState('EXPLORING');
    } else {
        addMessage('逃げ道が塞がれている！ 背後を突かれた！');
        processEnemyTurn(party, enemy); // 失敗すると敵のターンへ
    }
  }, [gameState, enemy, party, addMessage, processEnemyTurn]);

  const handleFight = useCallback(() => {
    if (gameState !== 'BATTLE') return;
    const attacker = party[activeBattler];
    
    // 予期せぬ呼び出し（討死メンバー）へのガード
    if (attacker.hp === 0) {
        const next = party.findIndex((m, i) => i > activeBattler && m.hp > 0);
        if (next !== -1) setActiveBattler(next);
        else processEnemyTurn(party, enemy);
        return;
    }

    const pAttack = calculateHitAndDamage(attacker.ac, attacker.minDmg, attacker.maxDmg, enemy.ac);
    let newEnemyHp = enemy.hp;
    if (pAttack.hit) {
      addMessage(`${attacker.name} の打ちかかり！ ${enemy.name} に ${pAttack.damage} のダメージ!`);
      newEnemyHp -= pAttack.damage;
    } else {
      addMessage(`${attacker.name} は空を切った！`);
    }

    if (newEnemyHp <= 0) {
      endBattle(true); return;
    }

    // 次の生存者を探す
    const nextBattler = party.findIndex((m, i) => i > activeBattler && m.hp > 0);
    if (nextBattler !== -1) {
      setActiveBattler(nextBattler);
      setEnemy({ ...enemy, hp: newEnemyHp });
    } else {
      processEnemyTurn(party, { ...enemy, hp: newEnemyHp });
      setEnemy({ ...enemy, hp: newEnemyHp });
    }
  }, [gameState, party, activeBattler, enemy, addMessage, endBattle, processEnemyTurn]);

  const castSpell = useCallback((spell) => {
    const attacker = party[activeBattler];
    if (attacker.mp < spell.mp) {
      addMessage(`${attacker.name} は魔力が足りない！`);
      return;
    }

    let newParty = [...party];
    newParty[activeBattler] = { ...attacker, mp: attacker.mp - spell.mp };
    let newEnemy = { ...enemy };

    if (spell.type === 'ATTACK') {
      const dmg = Math.floor(Math.random() * (spell.maxDmg - spell.minDmg + 1)) + spell.minDmg;
      addMessage(`${attacker.name} の【${spell.name}】！ ${enemy.name} に ${dmg} の属性ダメージ！`);
      newEnemy.hp -= dmg;
    } else if (spell.type === 'HEAL') {
      const heal = Math.floor(Math.random() * (spell.maxHeal - spell.minHeal + 1)) + spell.minHeal;
      const targets = newParty.filter(m => m.hp > 0).sort((a,b) => (a.hp/a.maxHp) - (b.hp/b.maxHp));
      if (targets.length > 0) {
          const targetIndex = newParty.findIndex(m => m.id === targets[0].id);
          newParty[targetIndex].hp = Math.min(newParty[targetIndex].maxHp, newParty[targetIndex].hp + heal);
          addMessage(`${attacker.name} の【${spell.name}】！ ${newParty[targetIndex].name} の傷が ${heal} 癒えた。`);
      }
    } else if (spell.type === 'BUFF') {
        if (spell.acBonus) {
            newParty = newParty.map(m => m.hp > 0 ? { ...m, ac: Math.max(0, m.ac - spell.acBonus) } : m);
            addMessage(`${attacker.name} の【${spell.name}】！ 全員の守りが固まった！`);
        }
    }

    setParty(newParty);
    setEnemy(newEnemy);
    setShowSpells(null);

    if (newEnemy.hp <= 0) {
      endBattle(true);
    } else {
      const nextBattler = newParty.findIndex((m, i) => i > activeBattler && m.hp > 0);
      if (nextBattler !== -1) setActiveBattler(nextBattler);
      else processEnemyTurn(newParty, newEnemy);
    }
  }, [party, activeBattler, enemy, addMessage, endBattle, processEnemyTurn]);
  
  // --- AI 戦闘ロジック ---
  useEffect(() => {
    if (isAutoBattle && gameState === 'BATTLE' && enemy) {
      const timer = setTimeout(() => {
        const attacker = party[activeBattler];
        if (!attacker || attacker.hp <= 0) return;

        // 尼僧：回復優先
        if (attacker.jobKey === 'NISOU') {
          const injured = party.find(m => m.hp > 0 && m.hp < m.maxHp * 0.7);
          const healSpells = (SPELLS.NISOU || []).filter(s => s.lv <= attacker.lv && s.type === 'HEAL');
          if (injured && healSpells.length > 0) {
            // 最も強い回復（人魚の肉 > 甘露の雨）を優先
            const bestHeal = healSpells.sort((a, b) => b.lv - a.lv).find(s => attacker.mp >= s.mp);
            if (bestHeal) {
              castSpell(bestHeal);
              return;
            }
          }
        }
        
        // 陰陽師：回復補助または強力な術
        if (attacker.jobKey === 'ONMYOJI') {
          const veryInjured = party.find(m => m.hp > 0 && m.hp < m.maxHp * 0.4);
          if (veryInjured && attacker.mp >= 2) {
             castSpell(SPELLS.ONMYOJI[0]); // 泰山府君
             return;
          }
          const attackSpells = (SPELLS.ONMYOJI || []).filter(s => s.lv <= attacker.lv && s.type === 'ATTACK');
          if (attackSpells.length > 0) {
             const bestSpell = attackSpells.sort((a, b) => b.lv - a.lv).find(s => attacker.mp >= s.mp);
             if (bestSpell) {
               castSpell(bestSpell);
               return;
             }
          }
        }

        // 武者：ボス戦なら奥義、雑魚なら通常攻撃
        if (attacker.jobKey === 'SAMURAI') {
           const attackSpells = (SPELLS.SAMURAI || []).filter(s => s.lv <= attacker.lv && s.type === 'ATTACK');
           if (enemy.isBoss && attackSpells.length > 0) {
              const bestSpell = attackSpells.sort((a,b) => b.lv - a.lv).find(s => attacker.mp >= s.mp);
              if (bestSpell) {
                castSpell(bestSpell);
                return;
              }
           }
        }

        // デフォルト：通常攻撃
        handleFight();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAutoBattle, gameState, enemy, party, activeBattler, handleFight, castSpell]);

  const renderMapCell = (cell, x, y) => {
    const isPlayerPos = playerState.x === x && playerState.y === y;
    const isHealSpot = HEAL_SPOTS.some(s => s.x === x && s.y === y);
    const isSignboardSpot = (x === 1 && y === 0) || (x === 1 && y === 2) || (x === 1 && y === 3); 
    const isExitSpot = bossDefeated && x === BOSS_POS.x && y === BOSS_POS.y;

    if (!cell.visited) return <div key={`${x}-${y}`} style={{ width: 35, height: 35, backgroundColor: '#000' }}></div>;
    return (
      <div key={`${x}-${y}`} style={{
        width: 35, height: 35, backgroundColor: isHealSpot ? '#113' : isSignboardSpot ? '#220' : '#111', position: 'relative',
        borderTop: cell.n ? '2px solid #aaa' : '1px dashed #333',
        borderRight: cell.e ? '2px solid #aaa' : '1px dashed #333',
        borderBottom: cell.s ? '2px solid #aaa' : '1px dashed #333',
        borderLeft: cell.w ? '2px solid #aaa' : '1px dashed #333', boxSizing: 'border-box'
      }}>
        {isHealSpot && <div style={{ position: 'absolute', top: 3, left: 8, color: '#66f', fontWeight: 'bold', fontSize: '1.4rem' }}>⛩</div>}
        {isSignboardSpot && <div style={{ position: 'absolute', top: 3, left: 8, color: '#aa0', fontWeight: 'bold', fontSize: '1.4rem' }}>🪵</div>}
        {isExitSpot && <div style={{ position: 'absolute', top: 3, left: 8, color: '#f33', fontWeight: 'bold', fontSize: '1.4rem' }}>✨</div>}
        {isPlayerPos && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) rotate(${playerState.dir * 90}deg)`, color: '#3f3', fontSize: '20px', lineHeight: 1 }}>▲</div>
        )}
      </div>
    );
  };

  return (
    <div className={`game-container ${isForceMobile ? 'layout-mobile' : ''}`}>
      <div className="window pane-main">
        <span className="window-title">【壱人称視点】平安の闇</span>
        {gameState === 'BATTLE' && enemy && (
          <div className="window pane-enemy">
            <span className="window-title">魔物</span>
            <div className="status-grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr', padding: '10px' }}>
              <div><div className="status-header">妖名</div><div style={{ fontSize: '1.4rem' }}>{enemy.name} <span style={{ fontSize: '1rem', color: '#aaa' }}>Lv.{enemy.lv}</span></div></div>
              <div><div className="status-header">体力</div><div>{enemy.hp} / {enemy.maxHp}</div></div>
              <div><div className="status-header">状態</div><div>平安</div></div>
            </div>
          </div>
        )}
        <div className="wireframe-container" style={{ position: 'relative' }}>
          <WireframeView mapData={mapData} playerPos={playerState} playerDir={playerState.dir} />
          {gameState === 'DEAD' && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(80,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ color: '#F22', fontSize: '3rem' }}>討死</div></div>}
          {gameState === 'CLEAR' && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,40,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ color: '#Ff2', fontSize: '3rem', textAlign: 'center' }}>🎉 階層突破 🎉<div style={{ fontSize: '1.5rem', marginTop: '10px' }}>都の安寧へ一歩近づいた...</div></div></div>}
          
          {/* ダンジョン画面タップ移動 & フリック旋回用オーバーレイ (モバイルのみ有効) */}
          <div className="dungeon-tap-overlay"
            onTouchStart={(e) => {
              touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }}
            onTouchEnd={(e) => {
              const deltaX = e.changedTouches[0].clientX - touchStartPos.current.x;
              const deltaY = e.changedTouches[0].clientY - touchStartPos.current.y;
              if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) processMove('TURN_RIGHT');
                else processMove('TURN_LEFT');
              }
            }}
          >
            {gameState === 'EXPLORING' && (
              <>
                <div className="tap-area tap-forward" onClick={() => processMove('FORWARD')}></div>
                <div className="tap-area tap-left" onClick={() => processMove('TURN_LEFT')}></div>
                <div className="tap-area tap-right" onClick={() => processMove('TURN_RIGHT')}></div>
                <div className="tap-area tap-backward" onClick={() => processMove('BACKWARD')}></div>
              </>
            )}
          </div>


          {/* ミニステータス・ダッシュボード (探索中および戦闘中に表示) */}
          {(gameState === 'EXPLORING' || gameState === 'BATTLE') && (
            <div className="mini-status-panel">
               {party.map(m => (
                 <div key={m.id} className="mini-status-unit">
                   <div style={{ paddingRight: '4px' }}>{m.icon}</div>
                   <div className="mini-status-name" style={{ color: m.hp <= 0 ? '#666' : '#fff' }}>{m.name}</div>
                   <div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', gap: '4px' }}>
                       <span>{m.hp}/{m.maxHp}</span>
                       <span>{m.mp}/{m.maxMp}</span>
                     </div>
                     <div className="bar-container"><div className="bar-hp" style={{ width: `${(m.hp / m.maxHp) * 100}%` }} /></div>
                     <div className="bar-container"><div className="bar-mp" style={{ width: `${(m.mp / m.maxMp) * 100}%` }} /></div>
                   </div>
                 </div>
               ))}
            </div>
          )}

        </div>

        {/* 和風ダイアログオーバーレイ (メインパネル全体を使用) */}
        {activeDialog && (
          <div className="dialog-overlay">
            <div className="dialog-title">{activeDialog.title}</div>
            <div className="dialog-content">
              {activeDialog.pages[activeDialog.currentPage]}
            </div>
            <div className="dialog-footer">
              {activeDialog.currentPage < activeDialog.pages.length - 1 ? (
                <button className="dialog-btn" onClick={() => { 
                  initAudio(); // 最初のページ送りで音声を初期化
                  setActiveDialog(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
                }}>
                  ▼ 続きを読む
                </button>
              ) : (
                activeDialog.showChoices ? (
                  <div className="dialog-choice-container">
                    <button className="dialog-btn" onClick={() => { initAudio(); activeDialog.onConfirm(); setActiveDialog(null); }}>【 はい 】</button>
                    <button className="dialog-btn" onClick={() => { initAudio(); setActiveDialog(null); }}>【 否 】</button>
                  </div>
                ) : (
                  <button className="dialog-btn" onClick={() => { initAudio(); if(activeDialog.onConfirm) activeDialog.onConfirm(); setActiveDialog(null); }}>
                    （ 読み終える ）
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- スマホ専用：ダンジョン下の操作・情報パネル --- */}
      {(gameState === 'EXPLORING' || gameState === 'BATTLE') && !activeDialog && (
        <div className="mobile-btn-container">
          <button className="map-toggle-btn" 
                  style={{ background: showMap ? '#b89a42' : '#222', color: showMap ? '#000' : '#f0e68c' }}
                  onClick={() => { setShowMap(!showMap); setShowStatus(false); }}>
             📜 {showMap ? '閉じる' : '絵図'}
          </button>
          <button className="map-toggle-btn" 
                  style={{ background: showStatus ? '#b89a42' : '#222', color: showStatus ? '#000' : '#f0e68c' }}
                  onClick={() => { setShowStatus(!showStatus); setShowMap(false); }}>
             📜 {showStatus ? '閉じる' : '隊員証'}
          </button>
          <button className="map-toggle-btn" onClick={() => { setShowMap(false); setShowStatus(false); }}>
             📜 記録
          </button>
        </div>
      )}

      {/* スマホ用ログ：マップもステータスも開いていない時に表示 */}
      {!activeDialog && !showMap && !showStatus && (
        <div className="mobile-log-display" id="mobile-log-display">
          {messages.map((m, i) => {
             const attackerNames = party.map(p => p.name);
             const isPlayerDamage = (m.includes('ダメージ') && !attackerNames.some(name => m.startsWith(name))) || m.includes('痛手') || m.includes('飲まれて');
             const isHeal = m.includes('癒えた') || m.includes('加護') || m.includes('満たされた') || m.includes('回復');
             const color = isPlayerDamage ? '#ffbbbb' : isHeal ? '#bbffbb' : '#eee';
             return <div key={i} className="mobile-log-line" style={{ color }}>{'>'} {m}</div>;
          })}
        </div>
      )}

      {/* デバッグパネル (isDebug = true の時のみ) */}
      {isDebug && (
        <div style={{
          position: 'fixed', bottom: '10px', right: '10px', 
          backgroundColor: 'rgba(0,50,0,0.85)', border: '2px solid #3f3', 
          color: '#3f3', padding: '15px', zIndex: 9999, fontSize: '0.9rem',
          borderRadius: '8px', minWidth: '200px'
        }}>
          <div style={{ fontWeight: 'bold', borderBottom: '1px solid #3f3', marginBottom: '8px' }}>⛩️ 開発者・神託之窓</div>
          <div style={{ marginBottom: '8px' }}>
            座標: ({playerState.x}, {playerState.y}) 向き: {playerState.dir}
          </div>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
            <input type="number" id="debugX" placeholder="x" style={{ width: '40px', backgroundColor: '#000', color: '#3f3', border: '1px solid #3f3' }} />
            <input type="number" id="debugY" placeholder="y" style={{ width: '40px', backgroundColor: '#000', color: '#3f3', border: '1px solid #3f3' }} />
            <button onClick={() => debugWarp(document.getElementById('debugX').value, document.getElementById('debugY').value)} 
                    style={{ backgroundColor: '#030', color: '#3f3', cursor: 'pointer' }}>跳躍</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button onClick={debugHeal} style={{ backgroundColor: '#030', color: '#3f3', cursor: 'pointer' }}>神格全快</button>
            <button onClick={debugKill} style={{ backgroundColor: '#030', color: '#3f3', cursor: 'pointer' }}>強制全滅テスト</button>
            <button onClick={debugEnemyKill} style={{ backgroundColor: '#030', color: '#3f3', cursor: 'pointer' }}>敵・一撃死（テスト用）</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
               <input type="checkbox" checked={debugEncounter} onChange={(e) => setDebugEncounter(e.target.checked)} />
               魔物遭遇
            </label>
          </div>
          <div style={{ borderTop: '1px solid #3f3', marginTop: '8px', paddingTop: '8px', fontSize: '0.8rem' }}>
             レイアウト切替：<br/>
             <a href="?debug=1" style={{ color: '#3f3', marginRight: '10px' }}>【PC版】</a>
             <a href="?debug=1&mobile=1" style={{ color: '#3f3' }}>【スマホ版】</a>
          </div>
        </div>
      )}

      {/* 音量コントロールパネル */}
      <div style={{
        position: 'fixed', bottom: '10px', left: '10px', 
        backgroundColor: 'rgba(50,20,0,0.85)', border: '1px solid #c93', 
        color: '#c93', padding: '10px', zIndex: 9999, fontSize: '0.8rem',
        borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)'
      }}>
        <button onClick={() => setIsMuted(!isMuted)} 
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', outline: 'none' }}>
          {isMuted ? '🔕' : '🔔'}
        </button>
        <span style={{ fontSize: '0.7rem' }}>奏（音量）</span>
        <input type="range" min="0" max="1" step="0.05" value={volume} 
               onChange={(e) => { setVolume(parseFloat(e.target.value)); if(isMuted) setIsMuted(false); }} 
               style={{ cursor: 'pointer', width: '80px', accentColor: '#c93' }} />
      </div>

      <div className={`window pane-status ${showStatus ? 'mobile-active-pane' : ''}`}>
        <span className="window-title">隊員之証 (Party Status)</span>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px' }}>
          {/* ヘッダー行 (モバイル時は少し簡略化) */}
          <div className="status-grid" style={{ borderBottom: '1px solid #555', paddingBottom: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
            <div className="status-header">記</div>
            <div className="status-header">職種</div>
            <div className="status-header">氏名</div>
            <div className="status-header">階級</div>
            <div className="status-header">体力</div>
            <div className="status-header">霊力</div>
            <div className="status-header">状態</div>
          </div>

          {/* メンバー行 */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {party.map((m, idx) => (
              <div key={m.id} className="status-grid" style={{ 
                backgroundColor: (gameState === 'BATTLE' && activeBattler === idx) ? '#153315' : 'transparent', 
                color: (gameState === 'BATTLE' && activeBattler === idx) ? '#3f3' : '#fff',
                padding: '12px 0',
                fontSize: showStatus ? '1.2rem' : '1.1rem',
                borderBottom: '1px solid #222'
              }}>
                <div style={{ fontSize: '1.4rem' }}>{m.icon}</div>
                <div style={{ fontSize: '0.9rem', color: '#aaa' }}>{m.job}</div>
                <div style={{ textAlign: 'left', paddingLeft: '5px' }}>{m.name}</div>
                <div>Lv{m.lv}</div>
                
                {/* 体力バー */}
                <div style={{ padding: '0 10px' }}>
                  <div className="status-value-text" style={{ color: m.hp < (m.maxHp * 0.3) ? '#f33' : 'inherit' }}>{m.hp}/{m.maxHp}</div>
                  <div className="pc-bar-container">
                    <div className="pc-bar-hp" style={{ width: `${(m.hp / m.maxHp) * 100}%` }} />
                  </div>
                </div>

                {/* 霊力バー */}
                <div style={{ padding: '0 10px' }}>
                  <div className="status-value-text">{m.mp}/{m.maxMp}</div>
                  <div className="pc-bar-container">
                    <div className="pc-bar-mp" style={{ width: `${(m.mp / m.maxMp) * 100}%` }} />
                  </div>
                </div>

                <div style={{ color: m.status === '討死' ? '#f33' : 'inherit' }}>{m.status}</div>
              </div>
            ))}
          </div>

          {showStatus && (
            <button className="dialog-btn" style={{ marginTop: '20px', width: '200px', alignSelf: 'center' }} onClick={() => setShowStatus(false)}>
               閉じる
            </button>
          )}
        </div>
      </div>

      <div className={`window pane-map ${showMap ? 'mobile-active-pane' : ''}`}>
        <span className="window-title">絵図と絵巻 (Map & Log)</span>
        <div className="map-view-wrapper">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingBottom: '15px', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAP_WIDTH}, 35px)`, gridTemplateRows: `repeat(${MAP_HEIGHT}, 35px)`, border: '2px solid #555', padding: '2px' }}>
              {mapData.map((row, y) => row.map((cell, x) => renderMapCell(cell, x, y)))}
            </div>
            <div style={{ fontSize: '1.2rem', color: '#aaa', border: '1px solid #444', padding: '12px', backgroundColor: '#080808', flexShrink: 0 }}>
              <div style={{ color: '#fff', borderBottom: '1px solid #333', marginBottom: '10px', textAlign: 'center' }}>凡例</div>
              <div style={{ marginBottom: '15px', color: '#f0e68c', textAlign: 'center', borderBottom: '1px solid #444', paddingBottom: '8px' }}>
                 現在地：[{playerState.x}, {playerState.y}]
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}><span style={{ color: '#66f', fontSize: '1.8rem' }}>⛩</span>結界</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}><span style={{ color: '#aa0', fontSize: '1.8rem' }}>🪵</span>立て札</div>
              {bossDefeated && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}><span style={{ color: '#f33', fontSize: '1.8rem' }}>✨</span>出口</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#3f3', fontSize: '1.4rem' }}>▲</span>現在地</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, borderTop: '2px solid #666', paddingTop: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {gameState === 'BATTLE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '10px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ fontSize: '1.1rem', color: '#3f3' }}>【覚悟せよ、{party[activeBattler].name}！】</div>
                 <button 
                  onClick={() => setIsAutoBattle(!isAutoBattle)} 
                  style={{ 
                    backgroundColor: isAutoBattle ? '#050' : '#444', 
                    color: isAutoBattle ? '#3f3' : '#eee',
                    border: '1px solid #777',
                    padding: '2px 8px',
                    fontFamily: 'DotGothic16',
                    cursor: 'pointer'
                  }}>
                   AI戦闘: {isAutoBattle ? '自動' : '手動'}
                 </button>
               </div>
               <div style={{ display: 'flex', gap: '8px', opacity: isAutoBattle ? 0.5 : 1, pointerEvents: isAutoBattle ? 'none' : 'auto' }}>
                 <button onClick={handleFight} className="battle-btn" style={{ fontSize: '1.4rem', padding: '12px' }}>打ちかかる</button>
                 <button onClick={() => setShowSpells(showSpells === party[activeBattler].id ? null : party[activeBattler].id)} className="battle-btn" style={{ fontSize: '1.4rem', padding: '12px' }}>術・祈祷</button>
                 <button onClick={handleRun} className="battle-btn" style={{ fontSize: '1.4rem', padding: '12px', backgroundColor: '#422' }}>逃げる</button>
               </div>
               {showSpells && (
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', backgroundColor: '#111', padding: '8px' }}>
                    {(SPELLS[party[activeBattler].jobKey] || []).filter(s => s.lv <= party[activeBattler].lv).map(s => (
                      <button key={s.id} onClick={() => castSpell(s)} className="spell-btn" style={{ fontSize: '1.1rem', padding: '8px' }}>{s.name} ({s.mp})</button>
                    ))}
                 </div>
               )}
            </div>
          )}
          <div className="pc-log-display" style={{ flex: 1, padding: '10px', overflowY: 'auto', backgroundColor: '#000', color: '#eee', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {messages.map((m, i) => {
               // 味方がダメージを受けた時だけ赤（ピンチ強調）
               const attackerNames = party.map(p => p.name);
               const isPlayerDamage = (m.includes('ダメージ') && !attackerNames.some(name => m.startsWith(name))) || m.includes('痛手') || m.includes('飲まれて');
               const isHeal = m.includes('癒えた') || m.includes('加護') || m.includes('満たされた') || m.includes('回復');
               const color = isPlayerDamage ? '#ff4444' : isHeal ? '#44ff44' : '#eee';
               return <div key={i} style={{ color }}>{'>'} {m}</div>;
            })}
          </div>
        </div>
      </div>

      <style>{`
        .battle-btn { flex: 1; cursor: pointer; font-family: 'DotGothic16'; background: #333; color: #fff; border: 1px solid #aaa; }
        .battle-btn:hover { background: #444; }
        .spell-btn { cursor: pointer; font-family: 'DotGothic16'; background: #222; color: #3f3; border: 1px solid #444; }
        .spell-btn:hover { background: #333; }
        .pane-status .status-grid { display: grid; text-align: center; }
      `}</style>
    </div>
  );
}

export default App;
