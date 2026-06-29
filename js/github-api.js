/**
 * GitHub API 封装模块
 */
const GitHubAPI = {
  REPO_OWNER: 'Archercool',
  REPO_NAME: 'wiki-editor',
  API_BASE: 'https://api.github.com',

  /**
   * 获取认证头
   */
  getHeaders() {
    const token = Auth.getToken();
    return {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };
  },

  /**
   * 获取文件内容
   */
  async getFile(path) {
    try {
      const response = await fetch(
        `${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${path}`,
        { headers: this.getHeaders() }
      );

      if (response.status === 404) {
        return null; // 文件不存在
      }

      if (!response.ok) {
        throw new Error(`获取文件失败: ${response.statusText}`);
      }

      const data = await response.json();
      // 解码内容
      data.decoded_content = decodeURIComponent(escape(atob(data.content)));
      return data;
    } catch (error) {
      console.error('获取文件错误:', error);
      throw error;
    }
  },

  /**
   * 创建或更新文件
   */
  async createOrUpdateFile(path, content, message) {
    try {
      // 先获取现有文件（如果是更新）
      const existing = await this.getFile(path);
      const sha = existing ? existing.sha : null;

      const body = {
        message: message || `Update ${path}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: 'main'
      };

      if (sha) {
        body.sha = sha; // 更新时需要 SHA
      }

      const response = await fetch(
        `${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${path}`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '保存失败');
      }

      return await response.json();
    } catch (error) {
      console.error('保存文件错误:', error);
      throw error;
    }
  },

  /**
   * 删除文件
   */
  async deleteFile(path, message) {
    try {
      const existing = await this.getFile(path);
      if (!existing) {
        throw new Error('文件不存在');
      }

      const response = await fetch(
        `${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${path}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
          body: JSON.stringify({
            message: message || `Delete ${path}`,
            sha: existing.sha,
            branch: 'main'
          })
        }
      );

      if (!response.ok) {
        throw new Error('删除失败');
      }

      return true;
    } catch (error) {
      console.error('删除文件错误:', error);
      throw error;
    }
  },

  /**
   * 列出目录内容
   */
  async listFiles(path = '') {
    try {
      const url = path
        ? `${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${path}`
        : `${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents`;

      const response = await fetch(url, { headers: this.getHeaders() });

      if (!response.ok) {
        throw new Error('获取目录失败');
      }

      return await response.json();
    } catch (error) {
      console.error('获取目录错误:', error);
      throw error;
    }
  },

  /**
   * 上传图片并返回 URL
   */
  async uploadImage(file, path) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          const timestamp = Date.now();
          const ext = file.name.split('.').pop();
          const fileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
          const filePath = path ? `${path}/${fileName}` : `assets/images/${fileName}`;

          const response = await fetch(
            `${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/${filePath}`,
            {
              method: 'PUT',
              headers: this.getHeaders(),
              body: JSON.stringify({
                message: `Upload image: ${fileName}`,
                content: base64,
                branch: 'main'
              })
            }
          );

          if (!response.ok) {
            throw new Error('上传失败');
          }

          const data = await response.json();
          // 返回原始内容 URL（用于 Markdown）
          resolve(`https://raw.githubusercontent.com/${this.REPO_OWNER}/${this.REPO_NAME}/main/${filePath}`);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * 获取仓库信息
   */
  async getRepoInfo() {
    const response = await fetch(
      `${this.API_BASE}/repos/${this.REPO_OWNER}/${this.REPO_NAME}`,
      { headers: this.getHeaders() }
    );
    return await response.json();
  }
};
