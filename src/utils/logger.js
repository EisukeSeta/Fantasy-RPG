/**
 * src/utils/logger.js
 * 都の記記録（ロギング）を司る基盤。
 * 聖典 LOGGING_RULE.md に基づき、構造化された記録を出力する。
 */

const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const isDebug = params.get('debug') === 'true';
const isVerbose = params.get('verbose') === 'true';
const logFilter = params.get('log_filter');

/**
 * ログの整形と出力を担当する
 */
class LoggerInstance {
  /**
   * 情報を記録する (debug=true で表示)
   * @param {string} category [Combat], [Nav], [State] 等
   * @param {string} action 行動名
   * @param {Object} [details={}] 詳細データ
   */
  info(category, action, details = {}) {
    if (!isDebug) return;
    if (logFilter && !category.toLowerCase().includes(logFilter.toLowerCase())) return;

    const detailStr = Object.keys(details).length > 0 ? `| ${JSON.stringify(details)}` : '';
    console.info(`%c[${category}] %c${action} %c${detailStr}`, 'color: #f1c40f; font-weight: bold;', 'color: #fff;', 'color: #888;');
  }

  /**
   * 微細な挙動を記録する (verbose=true で表示)
   * @param {string} category 
   * @param {string} action 
   * @param {Object} [details={}] 
   */
  trace(category, action, details = {}) {
    if (!isVerbose) return;
    if (logFilter && !category.toLowerCase().includes(logFilter.toLowerCase())) return;

    const detailStr = Object.keys(details).length > 0 ? `| ${JSON.stringify(details)}` : '';
    console.debug(`%c[${category}] %c${action} %c${detailStr}`, 'color: #3498db; font-style: italic;', 'color: #999;', 'color: #666;');
  }

  /**
   * 警告を記録する (常に表示)
   * @param {string} category 
   * @param {string} action 
   * @param {Object} [details={}] 
   */
  warn(category, action, details = {}) {
    const detailStr = Object.keys(details).length > 0 ? `| ${JSON.stringify(details)}` : '';
    console.warn(`%c[${category}] %c${action} %c${detailStr}`, 'color: #e67e22; font-weight: bold;', 'color: #fff;', 'color: #888;');
    // 必要に応じて外部監視サービスへの送信ロジックをここに追記
  }

  /**
   * 非純粋な副作用（不純物）の発生を記録する
   */
  impurity(category, action, details = {}) {
    this.warn(`${category}!IMPURITY`, action, details);
  }
}

export const Logger = new LoggerInstance();
