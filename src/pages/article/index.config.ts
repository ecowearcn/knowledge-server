export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '文章详情',
    })
  : { navigationBarTitleText: '文章详情' };
