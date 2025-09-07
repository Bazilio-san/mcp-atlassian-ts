import JiraEndpointsTester from './jira-endpoints-tester.js';

console.log('🚀 Starting JIRA endpoints testing...');

const tester = new JiraEndpointsTester({
  baseUrl: 'http://localhost:8080', // URL эмулятора JIRA
  auth: {
    type: 'basic',
    username: 'admin',
    password: 'admin'
  }
});

try {
  const results = await tester.runAllTests();
  console.log('\n🎉 Testing completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('💥 Testing failed:', error);
  process.exit(1);
}