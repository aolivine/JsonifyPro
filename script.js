class JSONFormatter {
    constructor() {
        this.collapsedState = new Set();
        this.currentData = null;
        this.init();
    }

    init() {
        this.bindEvents(); 
        // 页面加载时聚焦输入框
        const input = document.getElementById('json-input');
        if (input) input.focus();
    }

    bindEvents() {
        const inputBox = document.getElementById('json-input');

        document.getElementById('format-btn').addEventListener('click', () => this.formatJSON());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearInput());
        document.getElementById('example-btn').addEventListener('click', () => this.loadExample());
        document.getElementById('compress-btn').addEventListener('click', () => this.compressJSON());
        document.getElementById('copy-btn').addEventListener('click', () => this.copyOutput());
        document.getElementById('expand-all-btn').addEventListener('click', () => this.expandAll());
        document.getElementById('collapse-all-btn').addEventListener('click', () => this.collapseAll());

        document.addEventListener('keydown', (e) => this.handleShortcuts(e));
        inputBox.addEventListener('input', (e) => {
            this.validateJSON(e.target.value);
        });

        // 自动格式化粘贴内容
        inputBox.addEventListener('paste', () => {
            setTimeout(() => {
                const text = inputBox.value.trim();
                if (!text) return;
                try {
                    this.currentData = JSON.parse(text);
                    this.renderFullJSON();
                } catch (e) {
                    document.getElementById('json-output').innerHTML =
                        `<span style="color:red;">JSON 格式错误: ${e.message}</span>`;
                }
            }, 50); // 确保粘贴完成
        });
    }

    handleShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'Enter': e.preventDefault(); this.formatJSON(); break;
                case 'd': e.preventDefault(); this.clearInput(); break;
                case 'c': 
                    if (document.activeElement !== document.getElementById('json-input')) {
                        e.preventDefault(); this.copyOutput();
                    }
                    break;
                case 'e': e.preventDefault(); this.expandAll(); break;
                case 'r': e.preventDefault(); this.collapseAll(); break;
            }
        }
    }

    validateJSON(jsonString) {
        try {
            JSON.parse(jsonString);
            return true;
        } catch (error) {
            return false;
        }
    }

    formatJSON() {
        const input = document.getElementById('json-input').value.trim();
        const output = document.getElementById('json-output');
        
        if (!input) {
            this.showToast('请输入JSON字符串', 'error');
            return;
        }

        try {
            this.currentData = JSON.parse(input);
            this.renderFullJSON();
        } catch (error) {
            output.innerHTML = `<div class="error-message">JSON解析错误: ${error.message}</div>`;
        }
    }

    renderFullJSON() {
        if (!this.currentData) return;
        const output = document.getElementById('json-output');
        const formatted = this.formatWithCollapse(this.currentData);
        output.innerHTML = formatted;
        this.attachCollapseEvents();
    }

    formatWithCollapse(data, path = '') {
        if (typeof data === 'object' && data !== null) {
            const isArray = Array.isArray(data);
            const items = isArray ? data : Object.entries(data);
            const isEmpty = items.length === 0;
            const isCollapsed = this.collapsedState.has(path);

            if (isEmpty) {
                return isArray ? '[]' : '{}';
            }

            if (isCollapsed) {
                const count = items.length;
                const type = isArray ? 'array' : 'object';
                return `<span class="json-collapsible" data-path="${path}">
                    <span class="collapse-icon">▶</span>
                    ${isArray ? '[' : '{'}
                    <span class="json-collapsed">${count} ${type} item${count !== 1 ? 's' : ''}</span>
                    ${isArray ? ']' : '}'}
                </span>`;
            }

            let html = isArray ? '[' : '{';
            html += '<div class="json-children">';

            items.forEach((item, index) => {
                const key = isArray ? index : item[0];
                const value = isArray ? item : item[1];
                const newPath = this.createPath(path, key, isArray);
                
                html += `<div class="json-item">`;
                if (!isArray) {
                    html += `<span class="json-key">"${this.escapeHtml(key)}"</span>: `;
                }
                html += this.formatWithCollapse(value, newPath);
                if (index < items.length - 1) {
                    html += ',';
                }
                html += `</div>`;
            });

            html += '</div>';
            html += isArray ? ']' : '}';
            
            return `<span class="json-collapsible" data-path="${path}">
                <span class="collapse-icon">▼</span>
                ${html}
            </span>`;
        } else {
            return this.formatPrimitive(data);
        }
    }

    createPath(parentPath, key, isArray) {
        if (!parentPath) {
            return isArray ? `[${key}]` : key;
        }
        return isArray ? `${parentPath}[${key}]` : `${parentPath}.${key}`;
    }

    formatPrimitive(value) {
        if (typeof value === 'string') {
            return `<span class="json-string">"${this.escapeHtml(value)}"</span>`;
        } else if (typeof value === 'number') {
            return `<span class="json-number">${value}</span>`;
        } else if (typeof value === 'boolean') {
            return `<span class="json-boolean">${value}</span>`;
        } else if (value === null) {
            return `<span class="json-null">null</span>`;
        }
        return String(value);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    attachCollapseEvents() {
        document.querySelectorAll('.json-collapsible').forEach(element => {
            const icon = element.querySelector('.collapse-icon');
            const children = element.querySelector('.json-children');
            if (!children) return;

            // 初始状态
            if (this.collapsedState.has(element.dataset.path)) {
                children.style.display = 'none';
                icon.textContent = '▶';
            } else {
                children.style.display = 'block';
                icon.textContent = '▼';
            }

            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const path = element.dataset.path;
                if (this.collapsedState.has(path)) {
                    this.collapsedState.delete(path);
                    children.style.display = 'block';
                    icon.textContent = '▼';
                } else {
                    this.collapsedState.add(path);
                    children.style.display = 'none';
                    icon.textContent = '▶';
                }
            });
        });
    }


    getValueByPath(data, path) {
        if (!path) return data;
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = data;
        for (let p of parts) {
            if (p === '') continue;
            current = current[p];
            if (current === undefined) break;
        }
        return current;
    }

    toggleCollapse(path) {
        if (this.collapsedState.has(path)) {
            this.collapsedState.delete(path);
        } else {
            this.collapsedState.add(path);
        }
    }

    expandAll() {
        this.collapsedState.clear();
        this.renderFullJSON();
        this.showToast('已展开所有节点');
    }

    collapseAll() {
        if (!this.currentData) return;
        this.collapsedState.clear();
        this.collectAllPaths(this.currentData);
        this.renderFullJSON();
        this.showToast('已折叠所有节点');
    }

    collectAllPaths(data, path = '') {
        if (typeof data === 'object' && data !== null) {
            this.collapsedState.add(path);
            const isArray = Array.isArray(data);
            const items = isArray ? data : Object.entries(data);
            items.forEach((item, index) => {
                const key = isArray ? index : item[0];
                const value = isArray ? item : item[1];
                const newPath = this.createPath(path, key, isArray);
                this.collectAllPaths(value, newPath);
            });
        }
    }

    compressJSON() {
        const input = document.getElementById('json-input').value.trim();
        if (!input) return;
        try {
            const parsed = JSON.parse(input);
            document.getElementById('json-input').value = JSON.stringify(parsed);
            this.showToast('JSON已压缩');
        } catch (error) {
            this.showToast('JSON解析错误', 'error');
        }
    }

    copyOutput() {
        try {
            const jsonText = JSON.stringify(this.currentData, null, 2);
            navigator.clipboard.writeText(jsonText).then(() => {
                this.showToast('已复制JSON到剪贴板');
            });
        } catch (error) {
            this.showToast('复制失败', 'error');
        }
    }

    clearInput() {
        document.getElementById('json-input').value = '';
        document.getElementById('json-output').innerHTML = '';
        this.collapsedState.clear();
        this.currentData = null;
        this.showToast('已清空输入');
    }

    loadExample() {
        const example = `{
  "name": "用户信息",
  "details": {
    "personal": {
      "name": "张三",
      "age": 30,
      "address": {
        "city": "北京",
        "street": "朝阳区",
        "coordinates": {
          "latitude": 39.9042,
          "longitude": 116.4074
        }
      }
    },
    "professional": {
      "company": "科技公司",
      "position": "工程师",
      "skills": ["JavaScript", "Python", "Java"],
      "projects": [
        {
          "name": "项目A",
          "status": "completed",
          "team": ["成员1", "成员2"]
        },
        {
          "name": "项目B", 
          "status": "in-progress",
          "team": ["成员3", "成员4"]
        }
      ]
    }
  },
  "settings": {
    "notifications": true,
    "theme": "dark",
    "preferences": {
      "language": "zh-CN",
      "timezone": "UTC+8"
    }
  }
}`;
        document.getElementById('json-input').value = example;
        this.showToast('已加载示例JSON');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new JSONFormatter();
});
