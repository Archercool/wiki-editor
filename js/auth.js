/**
 * 认证模块 - 支持 GitHub OAuth
 */
const Auth = {
  CLIENT_ID: 'Iv23lib96sWmtpVWoZfE',
  OAUTH_PROXY: 'https://github-oauth-proxy.aoranli1126.workers.dev',
  REDIRECT_URI: 'https://archercool.github.io/wiki-editor/callback.html',
  TOKEN_KEY: 'wiki_editor_token',
  USER_KEY: 'wiki_editor_user',

  /**
   * 存储 Token
   */
  storeToken(token) {
    sessionStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.TOKEN_KEY, token);
  },

  /**
   * 获取存储的 Token
   */
  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY);
  },

  /**
   * 清除 Token
   */
  clearToken() {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
  },

  /**
   * 检查是否已认证
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * 验证 Token 有效性并获取用户信息
   */
  async validateToken(token) {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const user = await response.json();
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
        return { valid: true, user };
      }
      return { valid: false, error: 'Token 无效' };
    } catch (error) {
      return { valid: false, error: '网络错误' };
    }
  },

  /**
   * 获取存储的用户信息
   */
  getUser() {
    const userStr = sessionStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * 跳转到 GitHub OAuth 授权
   */
  login() {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      scope: 'repo',
      state: Math.random().toString(36).substring(7)
    });
    
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  },

  /**
   * 用 code 换取 token
   */
  async exchangeCode(code) {
    try {
      const response = await fetch(`${this.OAUTH_PROXY}/api/token?code=${code}`);
      const data = await response.json();
      
      if (data.access_token) {
        this.storeToken(data.access_token);
        return { success: true, token: data.access_token };
      }
      
      return { success: false, error: data.error_description || '授权失败' };
    } catch (error) {
      return { success: false, error: '网络错误' };
    }
  },

  /**
   * 显示登录弹窗
   */
  renderAuthModal(onSuccess) {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-modal-content">
        <div class="auth-modal-header">
          <h3>GitHub 登录</h3>
          <button class="auth-modal-close">&times;</button>
        </div>
        <div class="auth-modal-body">
          <div class="oauth-login-box">
            <p>使用 GitHub 账号一键登录</p>
            <p class="oauth-hint">首次使用需要授权，之后自动登录</p>
            <button id="github-login-btn" class="github-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              使用 GitHub 账号登录
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const loginBtn = modal.querySelector('#github-login-btn');
    const closeBtn = modal.querySelector('.auth-modal-close');

    loginBtn.addEventListener('click', () => this.login());
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
};
