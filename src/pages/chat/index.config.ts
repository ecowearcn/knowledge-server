export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: 'AI 对话',
    })
  : { navigationBarTitleText: 'AI 对话' };
