export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '导入文章',
    })
  : { navigationBarTitleText: '导入文章' };
