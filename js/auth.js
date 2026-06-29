/**
 * 认证模块 - 支持 Token 和 OAuth
 */
const Auth = {
  CLIENT_ID: 'Iv23lib96sWmtpVWoZfE',
  TOKEN_KEY: 'wiki_editor_token',
  USER_KEY: 'wiki_editor_user',
  REMEMBER_KEY: 'wiki_editor_remember',

  /**
   * 存储 Token
   */
  storeToken(token, remember = true) {
    sessionStorage.setItem(this.TOKEN_KEY, token);
    if (remember) {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.REMEMBER_KEY, 'true');
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REMEMBER_KEY);
    }
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
    localStorage.removeItem(this.REMEMBER_KEY);
  },

  /**
   * 检查是否已认证
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * 检查是否设置了记住
   */
  isRemembered() {
    return localStorage.getItem(this.REMEMBER_KEY) === 'true';
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
          <div id="auth-tabs">
            <div class="auth-tab-buttons">
              <button class="auth-tab-btn active" data-tab="token">Token 登录</button>
              <button class="auth-tab-btn" data-tab="guide">获取教程</button>
            </div>
            
            <div class="auth-tab-content active" id="tab-token">
              <p>输入你的 GitHub Personal Access Token</p>
              <input type="password" class="auth-token-input" 
                     placeholder="ghp_xxxxxxxxxxxx" autofocus>
              <label class="remember-label">
                <input type="checkbox" class="remember-checkbox" checked> 记住我
              </label>
              <div class="auth-error" style="display: none;"></div>
              <button class="primary-btn auth-submit-btn" style="width: 100%; margin-top: 16px;">
                登录
              </button>
            </div>
            
            <div class="auth-tab-content" id="tab-guide" style="display: none;">
              <div class="guide-steps">
                <p><strong>获取 Token 步骤：</strong></p>
                <ol>
                  <li>访问 <a href="https://github.com/settings/tokens" target="_blank">GitHub Token 页面</a></li>
                  <li>点击 <strong>"Generate new token (classic)"</strong></li>
                  <li>Note 填写：<code>wiki-editor</code></li>
                  <li>Expiration 选择：<code>90 days</code></li>
                  <li>勾选权限：<code>repo</code>（完整仓库权限）</li>
                  <li>点击 <strong>"Generate token"</strong></li>
                  <li>复制生成的 Token（只显示一次）</li>
                </ol>
                <p class="guide-note">
                  <small>⚠️ Token 只显示一次，请妥善保存</small>
                </p>
              </div>
              <button class="primary-btn" onclick="window.open('https://github.com/settings/tokens', '_blank')" style="width: 100%;">
                打开 GitHub Token 页面
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Tab 切换
    const tabBtns = modal.querySelectorAll('.auth-tab-btn');
    const tabContents = modal.querySelectorAll('.auth-tab-content');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => {
          c.classList.remove('active');
          c.style.display = 'none';
        });
        btn.classList.add('active');
        const tabId = 'tab-' + btn.dataset.tab;
        document.getElementById(tabId).style.display = 'block';
        document.getElementById(tabId).classList.add('active');
      });
    });

    const tokenInput = modal.querySelector('.auth-token-input');
    const submitBtn = modal.querySelector('.auth-submit-btn');
    const closeBtn = modal.querySelector('.auth-modal-close');
    const errorDiv = modal.querySelector('.auth-error');
    const rememberCheckbox = modal.querySelector('.remember-checkbox');

    // 如果之前设置了记住
    if (this.isRemembered()) {
      rememberCheckbox.checked = true;
    }

    const closeModal = () => modal.remove();

    const handleSubmit = async () => {
      const token = tokenInput.value.trim();
      if (!token) {
        errorDiv.textContent = '请输入 Token';
        errorDiv.style.display = 'block';
        return;
      }

      if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
        errorDiv.textContent = 'Token 格式不正确，应以 ghp_ 或 github_pat_ 开头';
        errorDiv.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '验证中...';
      errorDiv.style.display = 'none';

      const result = await this.validateToken(token);

      if (result.valid) {
        this.storeToken(token, rememberCheckbox.checked);
        closeModal();
        if (onSuccess) onSuccess(result.user);
      } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = '登录';
      }
    };

    submitBtn.addEventListener('click', handleSubmit);
    tokenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    tokenInput.focus();
  }
};
