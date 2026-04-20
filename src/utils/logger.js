/**
 * src/utils/logger.js
 * 都の記録（ロギング）を司る基盤。
 */

const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const isDebug = params.get('debug') === 'true';
const isVerbose = params.get('verbose') === 'true';
const logFilter = params.get('log_filter');

/**
 * ログの整形と出力を担当する
 */
class LoggerInstance {
  constructor() {
    this.logs = []; // 記憶の器
  }

  _record(category, action, details, type) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, category, action, details, type };
    this.logs.push(entry);
    
    // メモリ保護：1000件を超えたら古いものから削除
    if (this.logs.length > 1000) this.logs.shift();

    if (isDebug || type === 'WARN' || type === 'ERROR') {
      const detailStr = Object.keys(details).length > 0 ? `| ${JSON.stringify(details)}` : '';
      const styles = {
        INFO: 'color: #f1c40f; font-weight: bold;',
        TRACE: 'color: #3498db; font-style: italic;',
        WARN: 'color: #e67e22; font-weight: bold;',
        IMPURITY: 'color: #e74c3c; font-weight: bold; background: #2c3e50;'
      };
      
      console.log(`%c[${category}] %c${action} %c${detailStr}`, styles[type] || '', 'color: #fff;', 'color: #888;');
    }
  }

  info(category, action, details = {}) {
    this._record(category, action, details, 'INFO');
  }

  trace(category, action, details = {}) {
    this._record(category, action, details, 'TRACE');
  }

  warn(category, action, details = {}) {
    this._record(category, action, details, 'WARN');
  }

  impurity(category, action, details = {}) {
    this._record(category, action, details, 'IMPURITY');
  }

  /**
   * 蓄積された記録を写本（File）として出力する
   */
  downloadLogs() {
    const text = this.logs.map(l => `[${l.timestamp}] [${l.category}] ${l.action} ${JSON.stringify(l.details)}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rashomon_debug_${new Date().getTime()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const Logger = new LoggerInstance();
