/**
 * 认证模块 - 处理 GitHub Token 存储和验证
 */
const Auth = {
  TOKEN_KEY: 'wiki_editor_token',
  USER_KEY: 'wiki_editor_user',

  /**
   * 存储 Token 到 sessionStorage
   */
  storeToken(token) {
    sessionStorage.setItem(this.TOKEN_KEY, token);
  },

  /**
   * 获取存储的 Token
   */
  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY);
  },

  /**
   * 清除 Token
   */
  clearToken() {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
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
   * 显示认证弹窗
   * @param {Function} onSuccess - 认证成功回调
   */
  renderAuthModal(onSuccess) {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
      <div class="auth-modal-content">
        <div class="auth-modal-header">
          <h3>GitHub 认证</h3>
          <button class="auth-modal-close">&times;</button>
        </div>
        <div class="auth-modal-body">
          <p>请输入您的 GitHub Personal Access Token</p>
          <p class="auth-hint">
            <a href="https://github.com/settings/tokens" target="_blank">
              点击这里获取 Token
            </a>
            <br>
            <small>需要勾选 "repo" 权限</small>
          </p>
          <input type="password" class="auth-token-input" 
                 placeholder="ghp_xxxxxxxxxxxx" autofocus>
          <div class="auth-error" style="display: none;"></div>
        </div>
        <div class="auth-modal-footer">
          <button class="auth-cancel-btn">取消</button>
          <button class="auth-submit-btn">验证</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const tokenInput = modal.querySelector('.auth-token-input');
    const submitBtn = modal.querySelector('.auth-submit-btn');
    const cancelBtn = modal.querySelector('.auth-cancel-btn');
    const closeBtn = modal.querySelector('.auth-modal-close');
    const errorDiv = modal.querySelector('.auth-error');

    const closeModal = () => modal.remove();

    const handleSubmit = async () => {
      const token = tokenInput.value.trim();
      if (!token) {
        errorDiv.textContent = '请输入 Token';
        errorDiv.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '验证中...';

      const result = await this.validateToken(token);

      if (result.valid) {
        this.storeToken(token);
        closeModal();
        if (onSuccess) onSuccess(result.user);
      } else {
        errorDiv.textContent = result.error;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = '验证';
      }
    };

    submitBtn.addEventListener('click', handleSubmit);
    tokenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    tokenInput.focus();
  }
};
