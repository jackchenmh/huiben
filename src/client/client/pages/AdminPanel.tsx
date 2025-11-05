import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SystemConfig } from '@/types';
import api from '@/lib/api';
import {
  Settings,
  Save,
  RotateCcw,
  Download,
  Upload,
  Server,
  Database,
  Bell,
  Gamepad2,
  Shield,
  Palette,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';

interface SystemInfo {
  app: {
    name: string;
    version: string;
    maintenanceMode: boolean;
  };
  server: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memory: any;
  };
  database: {
    type: string;
    path: string;
  };
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editedConfigs, setEditedConfigs] = useState<Record<string, any>>({});

  useEffect(() => {
    if (user?.role !== 'teacher') {
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [configsResponse, systemInfoResponse] = await Promise.all([
        api.get('/config'),
        api.get('/config/admin/system-info')
      ]);

      setConfigs(configsResponse.data.configs);
      setSystemInfo(systemInfoResponse.data.systemInfo);
    } catch (error) {
      console.error('获取管理数据失败:', error);
      showMessage('error', '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleConfigChange = (key: string, value: any) => {
    setEditedConfigs(prev => ({ ...prev, [key]: value }));
  };

  const saveConfigs = async () => {
    if (Object.keys(editedConfigs).length === 0) {
      showMessage('error', '没有需要保存的更改');
      return;
    }

    setSaving(true);
    try {
      const configsToUpdate = Object.entries(editedConfigs).map(([key, value]) => ({
        key,
        value
      }));

      await api.patch('/config/batch', { configs: configsToUpdate });

      setEditedConfigs({});
      await fetchData();
      showMessage('success', '配置保存成功');
    } catch (error) {
      console.error('保存配置失败:', error);
      showMessage('error', '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('确定要重置所有配置为默认值吗？此操作不可撤销。')) {
      return;
    }

    try {
      await api.post('/config/reset');
      setEditedConfigs({});
      await fetchData();
      showMessage('success', '配置已重置为默认值');
    } catch (error) {
      console.error('重置配置失败:', error);
      showMessage('error', '重置配置失败');
    }
  };

  const exportConfigs = async () => {
    try {
      const response = await api.get('/config/admin/export');
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'system-configs.json';
      a.click();
      URL.revokeObjectURL(url);
      showMessage('success', '配置导出成功');
    } catch (error) {
      console.error('导出配置失败:', error);
      showMessage('error', '导出配置失败');
    }
  };

  const importConfigs = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.configs || !Array.isArray(data.configs)) {
        throw new Error('配置文件格式不正确');
      }

      await api.post('/config/admin/import', { configs: data.configs });
      await fetchData();
      showMessage('success', '配置导入成功');
    } catch (error) {
      console.error('导入配置失败:', error);
      showMessage('error', '导入配置失败');
    }
  };

  const categories = [
    { id: 'system', name: '系统设置', icon: Server, color: 'text-blue-600' },
    { id: 'notification', name: '通知设置', icon: Bell, color: 'text-green-600' },
    { id: 'game', name: '游戏设置', icon: Gamepad2, color: 'text-purple-600' },
    { id: 'security', name: '安全设置', icon: Shield, color: 'text-red-600' },
    { id: 'ui', name: '界面设置', icon: Palette, color: 'text-yellow-600' },
  ];

  const getConfigValue = (config: SystemConfig) => {
    if (editedConfigs.hasOwnProperty(config.key)) {
      return editedConfigs[config.key];
    }

    switch (config.dataType) {
      case 'number':
        return Number(config.value);
      case 'boolean':
        return config.value === 'true';
      case 'json':
        try {
          return JSON.parse(config.value);
        } catch {
          return config.value;
        }
      default:
        return config.value;
    }
  };

  const renderConfigInput = (config: SystemConfig) => {
    const value = getConfigValue(config);

    switch (config.dataType) {
      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleConfigChange(config.key, e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">
              {value ? '启用' : '禁用'}
            </span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleConfigChange(config.key, Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleConfigChange(config.key, parsed);
              } catch {
                handleConfigChange(config.key, e.target.value);
              }
            }}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleConfigChange(config.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        );
    }
  };

  if (user?.role !== 'teacher') {
    return (
      <div className="container py-8">
        <div className="card p-8 text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">访问受限</h2>
          <p className="text-gray-600">只有管理员可以访问系统管理面板</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="lg:col-span-3 h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const filteredConfigs = configs.filter(config => config.category === activeCategory);

  return (
    <div className="container py-8">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">系统管理</h1>
          <p className="mt-2 text-gray-600">管理系统配置和监控运行状态</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={exportConfigs}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>导出配置</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
            <Upload className="h-4 w-4" />
            <span>导入配置</span>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importConfigs(file);
              }}
              className="hidden"
            />
          </label>

          <button
            onClick={resetToDefaults}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>重置默认</span>
          </button>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 系统信息概览 */}
      {systemInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 text-center">
            <Server className="h-8 w-8 text-blue-500 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900">应用版本</h3>
            <p className="text-2xl font-bold text-blue-600">{systemInfo.app.version}</p>
          </div>

          <div className="card p-6 text-center">
            <Database className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900">数据库</h3>
            <p className="text-lg font-semibold text-green-600">{systemInfo.database.type}</p>
          </div>

          <div className="card p-6 text-center">
            <Info className="h-8 w-8 text-purple-500 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900">运行时间</h3>
            <p className="text-lg font-semibold text-purple-600">
              {Math.floor(systemInfo.server.uptime / 3600)}h
            </p>
          </div>

          <div className="card p-6 text-center">
            {systemInfo.app.maintenanceMode ? (
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
            )}
            <h3 className="font-medium text-gray-900">系统状态</h3>
            <p className={`text-lg font-semibold ${
              systemInfo.app.maintenanceMode ? 'text-red-600' : 'text-green-600'
            }`}>
              {systemInfo.app.maintenanceMode ? '维护中' : '正常'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧分类导航 */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">配置分类</h2>
            <nav className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeCategory === category.id
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <category.icon className={`h-5 w-5 ${category.color}`} />
                  <span>{category.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 右侧配置内容 */}
        <div className="lg:col-span-3">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {categories.find(c => c.id === activeCategory)?.name}
              </h2>

              <button
                onClick={saveConfigs}
                disabled={saving || Object.keys(editedConfigs).length === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  Object.keys(editedConfigs).length > 0
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="h-4 w-4" />
                <span>{saving ? '保存中...' : '保存更改'}</span>
              </button>
            </div>

            <div className="space-y-6">
              {filteredConfigs.map((config) => (
                <div key={config.key} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{config.key}</h3>
                      {config.description && (
                        <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        config.isPublic
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {config.isPublic ? '公开' : '私有'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                        {config.dataType}
                      </span>
                    </div>
                  </div>

                  {renderConfigInput(config)}

                  {editedConfigs.hasOwnProperty(config.key) && (
                    <div className="mt-2 flex items-center space-x-2 text-sm text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>已修改，等待保存</span>
                    </div>
                  )}
                </div>
              ))}

              {filteredConfigs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>此分类下暂无配置项</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}