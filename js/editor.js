/**
 * 编辑器核心模块
 */
const Editor = {
  instance: null,
  currentPath: null,
  isSaving: false,

  /**
   * 初始化编辑器
   */
  async init() {
    const params = new URLSearchParams(window.location.search);
    this.currentPath = params.get('path');
    const isNew = params.get('new') === 'true';

    // 检查认证状态
    if (!Auth.isAuthenticated()) {
      Auth.renderAuthModal(() => this.init());
      return;
    }

    // 显示加载状态
    this.showLoading('加载中...');

    try {
      let content = '';

      if (this.currentPath && !isNew) {
        // 加载现有文件
        const file = await GitHubAPI.getFile(this.currentPath);
        if (file) {
          content = file.decoded_content;
        }
      } else if (!this.currentPath) {
        // 没有指定路径，显示目录选择
        this.showPathSelector();
        return;
      }

      // 初始化 Vditor 编辑器
      this.initVditor(content);

      // 更新路径显示
      this.updatePathDisplay();

      // 绑定事件
      this.bindEvents();

    } catch (error) {
      this.showError(`加载失败: ${error.message}`);
    }
  },

  /**
   * 初始化 Vditor 编辑器
   */
  initVditor(content) {
    const toolbar = [
      'undo', 'redo', '|',
      'bold', 'italic', 'strikethrough', '|',
      'headings', 'strike', '|',
      'table', '|',
      'list', 'ordered-list', '|',
      'code', 'quote', '|',
      'link', {
        name: 'upload-image',
        icon: '📤',
        tipPosition: 's',
        tip: '上传图片',
        click: () => Uploader.buttonUpload(this.instance)
      }, '|',
      'edit-mode', 'preview', '|',
      'fullscreen', '|',
      'outline'
    ];

    this.instance = new Vditor('vditor', {
      // 模式：即时渲染（所见即所得）
      mode: 'sv',
      
      // 工具栏
      toolbar,
      
      // 预览配置
      preview: {
        delay: 300,
        mode: 'preview',
        markdown: {
          toc: true
        }
      },
      
      // 缓存（禁用，我们自己管理）
      cache: {
        enable: false
      },
      
      // 计数器
      counter: {
        enable: true
      },
      
      // 主题
      theme: 'classic',
      
      // 语言
      lang: 'zh_CN',
      
      // 回调
      input: () => {
        this.updateWordCount();
      },
      
      // 高度
      height: window.innerHeight - 100,

      // 自定义提示
      outline: {
        enable: true,
        position: 'right'
      }
    });

    // 设置初始内容
    this.instance.setValue(content);

    // 绑定快捷键
    this.bindKeyboardShortcuts();

    // 绑定粘贴和拖拽
    this.bindPasteAndDrop();
  },

  /**
   * 绑定快捷键
   */
  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S: 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.save();
      }
      
      // Ctrl/Cmd + Z: 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Vditor 内置支持
      }
      
      // Ctrl/Cmd + Shift + Z: 重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        // Vditor 内置支持
      }
    });
  },

  /**
   * 绑定粘贴和拖拽
   */
  bindPasteAndDrop() {
    const editorElement = document.getElementById('vditor');
    
    // 粘贴图片
    editorElement.addEventListener('paste', Uploader.handlePaste(this.instance));
    
    // 拖拽图片
    editorElement.addEventListener('drop', Uploader.handleDrop(this.instance));
    editorElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  },

  /**
   * 绑定事件
   */
  bindEvents() {
    // 保存按钮
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.save());
    }

    // 预览按钮
    const previewBtn = document.getElementById('preview-btn');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.togglePreview());
    }

    // 退出按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        Auth.clearToken();
        window.location.href = 'edit.html';
      });
    }
  },

  /**
   * 保存文件
   */
  async save() {
    if (this.isSaving) return;

    const pathInput = document.getElementById('path-input');
    let path = pathInput ? pathInput.value : this.currentPath;

    if (!path) {
      alert('请输入文件路径');
      return;
    }

    // 确保路径以 .md 结尾
    if (!path.endsWith('.md')) {
      path += '.md';
    }

    const content = this.instance.getValue();
    if (!content.trim()) {
      alert('内容不能为空');
      return;
    }

    this.isSaving = true;
    this.showSaveStatus('保存中...', 'saving');

    try {
      await GitHubAPI.createOrUpdateFile(
        path,
        content,
        `Update ${path} via web editor`
      );

      this.showSaveStatus('保存成功', 'success');
      
      // 更新当前路径
      this.currentPath = path;
      
      // 2秒后跳转到阅读页面
      setTimeout(() => {
        window.open(`https://github.com/Archercool/wiki-editor/blob/main/${path}`, '_blank');
      }, 1500);

    } catch (error) {
      this.showSaveStatus(`保存失败: ${error.message}`, 'error');
    } finally {
      this.isSaving = false;
    }
  },

  /**
   * 切换预览模式
   */
  togglePreview() {
    if (!this.instance) return;
    
    const currentMode = this.instance.getMode();
    if (currentMode === 'sv') {
      this.instance.changeEditMode();
    } else {
      this.instance.changeMode('sv');
    }
  },

  /**
   * 更新路径显示
   */
  updatePathDisplay() {
    const pathInput = document.getElementById('path-input');
    if (pathInput && this.currentPath) {
      pathInput.value = this.currentPath;
    }
  },

  /**
   * 更新字数统计
   */
  updateWordCount() {
    const counter = document.getElementById('word-count');
    if (counter && this.instance) {
      const content = this.instance.getValue();
      const count = content.length;
      counter.textContent = `${count} 字`;
    }
  },

  /**
   * 显示加载状态
   */
  showLoading(message) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>${message}</p>
      </div>
    `;
  },

  /**
   * 显示错误信息
   */
  showError(message) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="error-container">
        <h3>出错了</h3>
        <p>${message}</p>
        <button onclick="location.reload()">重试</button>
      </div>
    `;
  },

  /**
   * 显示路径选择器（新建文章时）
   */
  async showPathSelector() {
    const app = document.getElementById('app');
    
    // 获取现有目录结构
    let categories = ['AI', '产品优化', '编程', '工具'];
    try {
      const files = await GitHubAPI.listFiles('wiki');
      const dirs = files.filter(f => f.type === 'dir').map(f => f.name);
      if (dirs.length > 0) {
        categories = dirs;
      }
    } catch (e) {
      console.log('使用默认分类');
    }

    const categoryOptions = categories.map(c => 
      `<option value="${c}">${c}</option>`
    ).join('');

    app.innerHTML = `
      <div class="path-selector">
        <h3>新建文章</h3>
        <div class="path-form">
          <div class="form-group">
            <label>选择分类</label>
            <select id="category-select" class="form-select">
              ${categoryOptions}
            </select>
          </div>
          <div class="form-group">
            <label>文章标题</label>
            <input type="text" id="title-input" class="form-input" 
                   placeholder="例如: 机器学习基础" autofocus>
          </div>
          <div class="form-group">
            <label>预览路径</label>
            <div id="preview-path" class="preview-path">wiki/AI/机器学习基础.md</div>
          </div>
          <div class="form-actions">
            <a href="index.html" class="secondary-btn">取消</a>
            <button id="create-btn" class="primary-btn">创建文章</button>
          </div>
        </div>
      </div>
    `;

    const categorySelect = document.getElementById('category-select');
    const titleInput = document.getElementById('title-input');
    const previewPath = document.getElementById('preview-path');
    const createBtn = document.getElementById('create-btn');

    // 更新预览路径
    const updatePreview = () => {
      const category = categorySelect.value;
      const title = titleInput.value.trim() || '新文章';
      previewPath.textContent = `wiki/${category}/${title}.md`;
    };

    categorySelect.addEventListener('change', updatePreview);
    titleInput.addEventListener('input', updatePreview);
    updatePreview();

    // 创建文章
    const handleCreate = () => {
      const category = categorySelect.value;
      const title = titleInput.value.trim();
      
      if (!title) {
        alert('请输入文章标题');
        return;
      }

      const path = `wiki/${category}/${title}.md`;
      this.currentPath = path;
      
      // 隐藏选择器，显示编辑器
      document.getElementById('app').style.display = 'none';
      document.getElementById('editor-container').style.display = 'flex';
      
      // 初始化编辑器
      this.initVditor('');
      this.updatePathDisplay();
      this.bindEvents();
    };

    createBtn.addEventListener('click', handleCreate);
    titleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleCreate();
    });

    titleInput.focus();
  },

  /**
   * 显示保存状态
   */
  showSaveStatus(message, type) {
    const status = document.getElementById('save-status');
    if (status) {
      status.textContent = message;
      status.className = `save-status ${type}`;
      
      if (type === 'success' || type === 'error') {
        setTimeout(() => {
          status.textContent = '';
          status.className = 'save-status';
        }, 3000);
      }
    }
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  Editor.init();
});
