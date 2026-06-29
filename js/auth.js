/**
 * 认证模块 - 支持 GitHub OAuth Device Flow
 */
const Auth = {
  CLIENT_ID: 'Iv23lib96sWmtpVWoZfE',
  TOKEN_KEY: 'wiki_editor_token',
  USER_KEY: 'wiki_editor_user',
  DEVICE_CODE_KEY: 'wiki_device_code',

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
    sessionStorage.removeItem(this.DEVICE_CODE_KEY);
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
   * 启动 Device Flow 认证
   */
  async startDeviceFlow() {
    try {
      // 1. 请求 device code
      const response = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.CLIENT_ID,
          scope: 'repo'
        })
      });

      if (!response.ok) {
        throw new Error('请求 device code 失败');
      }

      const data = await response.json();
      
      // 存储 device code
      sessionStorage.setItem(this.DEVICE_CODE_KEY, JSON.stringify(data));
      
      return {
        success: true,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        expiresIn: data.expires_in
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * 轮询获取 Token
   */
  async pollForToken() {
    const deviceCodeStr = sessionStorage.getItem(this.DEVICE_CODE_KEY);
    if (!deviceCodeStr) {
      return { success: false, error: '未找到 device code' };
    }

    const deviceData = JSON.parse(deviceCodeStr);

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.CLIENT_ID,
          device_code: deviceData.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });

      const data = await response.json();

      if (data.access_token) {
        // 成功获取 token
        this.storeToken(data.access_token);
        sessionStorage.removeItem(this.DEVICE_CODE_KEY);
        return { success: true, token: data.access_token };
      }

      if (data.error) {
        switch (data.error) {
          case 'authorization_pending':
            return { success: false, pending: true, message: '等待用户授权...' };
          case 'slow_down':
            return { success: false, pending: true, message: '请求过于频繁' };
          case 'expired_token':
            return { success: false, error: '授权码已过期，请重新开始' };
          case 'access_denied':
            return { success: false, error: '用户拒绝了授权' };
          default:
            return { success: false, error: data.error_description || '授权失败' };
        }
      }

      return { success: false, error: '未知错误' };
    } catch (error) {
      return { success: false, error: '网络错误' };
    }
  },

  /**
   * 显示 OAuth 登录弹窗
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
          <div id="auth-step-1">
            <p>点击下方按钮，跳转到 GitHub 授权页面</p>
            <button id="start-oauth-btn" class="github-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              使用 GitHub 账号登录
            </button>
          </div>
          
          <div id="auth-step-2" style="display: none;">
            <p>请访问以下链接并输入验证码：</p>
            <div class="auth-code-box">
              <a id="auth-url" href="#" target="_blank" class="auth-url"></a>
              <div class="auth-code" id="auth-code"></div>
            </div>
            <p class="auth-hint">
              <small>授权码将在 15 分钟后过期</small>
            </p>
            <div class="auth-status" id="auth-status">等待授权中...</div>
          </div>

          <div id="auth-step-error" style="display: none;">
            <div class="auth-error" id="auth-error-msg"></div>
            <button id="retry-btn" class="tool-btn" style="margin-top: 12px;">重试</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 绑定事件
    const startBtn = modal.querySelector('#start-oauth-btn');
    const closeBtn = modal.querySelector('.auth-modal-close');
    const retryBtn = modal.querySelector('#retry-btn');
    const closeModal = () => modal.remove();

    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      startBtn.textContent = '请求中...';

      const result = await this.startDeviceFlow();

      if (result.success) {
        // 显示授权码
        modal.querySelector('#auth-step-1').style.display = 'none';
        modal.querySelector('#auth-step-2').style.display = 'block';
        modal.querySelector('#auth-url').textContent = result.verificationUri;
        modal.querySelector('#auth-url').href = result.verificationUri;
        modal.querySelector('#auth-code').textContent = result.userCode;

        // 复制到剪贴板
        navigator.clipboard.writeText(result.userCode).catch(() => {});

        // 开始轮询
        this.startPolling(onSuccess, modal);
      } else {
        modal.querySelector('#auth-step-1').style.display = 'none';
        modal.querySelector('#auth-step-error').style.display = 'block';
        modal.querySelector('#auth-error-msg').textContent = result.error;
      }
    });

    closeBtn.addEventListener('click', closeModal);
    retryBtn.addEventListener('click', () => {
      modal.remove();
      this.renderAuthModal(onSuccess);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  },

  /**
   * 开始轮询 Token
   */
  startPolling(onSuccess, modal) {
    const statusEl = modal.querySelector('#auth-status');
    const interval = 5000; // 5秒轮询一次
    
    const poll = async () => {
      const result = await this.pollForToken();

      if (result.success) {
        // 成功
        modal.remove();
        const user = await this.validateToken(result.token);
        if (onSuccess) onSuccess(user.user);
      } else if (result.pending) {
        // 继续等待
        statusEl.textContent = result.message || '等待授权中...';
        setTimeout(poll, interval);
      } else {
        // 错误
        modal.querySelector('#auth-step-2').style.display = 'none';
        modal.querySelector('#auth-step-error').style.display = 'block';
        modal.querySelector('#auth-error-msg').textContent = result.error;
      }
    };

    setTimeout(poll, interval);
  }
};
