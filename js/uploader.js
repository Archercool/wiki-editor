/**
 * 图片上传模块
 */
const Uploader = {
  /**
   * 上传单个文件
   */
  async uploadFile(file, basePath = 'assets/images') {
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支持的文件类型，请上传图片文件');
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过 5MB');
    }

    return await GitHubAPI.uploadImage(file, basePath);
  },

  /**
   * 批量上传文件
   */
  async uploadFiles(files, basePath = 'assets/images') {
    const results = [];
    for (const file of files) {
      try {
        const url = await this.uploadFile(file, basePath);
        results.push({ success: true, url, name: file.name });
      } catch (error) {
        results.push({ success: false, error: error.message, name: file.name });
      }
    }
    return results;
  },

  /**
   * 处理粘贴事件
   */
  handlePaste(editor) {
    return async (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            try {
              const url = await this.uploadFile(file);
              // 在编辑器中插入图片
              const cursorPos = editor.getCursor();
              const imageMarkdown = `![图片](${url})`;
              editor.replaceRange(imageMarkdown, cursorPos);
            } catch (error) {
              alert(`图片上传失败: ${error.message}`);
            }
          }
          break;
        }
      }
    };
  },

  /**
   * 处理拖拽事件
   */
  handleDrop(editor) {
    return async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          try {
            const url = await this.uploadFile(file);
            const cursorPos = editor.getCursor();
            const imageMarkdown = `![${file.name}](${url})`;
            editor.replaceRange(imageMarkdown, cursorPos);
          } catch (error) {
            alert(`图片上传失败: ${error.message}`);
          }
        }
      }
    };
  },

  /**
   * 创建文件选择器
   */
  createFileInput(onSelect) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    input.addEventListener('change', (e) => {
      onSelect(e.target.files);
      input.remove();
    });
    document.body.appendChild(input);
    return input;
  },

  /**
   * 按钮点击上传
   */
  async buttonUpload(editor) {
    const input = this.createFileInput(async (files) => {
      for (const file of files) {
        try {
          const url = await this.uploadFile(file);
          const cursorPos = editor.getCursor();
          const imageMarkdown = `![${file.name}](${url})`;
          editor.replaceRange(imageMarkdown, cursorPos);
        } catch (error) {
          alert(`图片上传失败: ${error.message}`);
        }
      }
    });
    input.click();
  }
};
