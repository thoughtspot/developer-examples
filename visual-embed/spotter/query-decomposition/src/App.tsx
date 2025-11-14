import { useState } from 'react'
import { Layout, Typography, Card, Row, Col } from 'antd'
import './App.css'
import ChatButton from './components/ChatButton'
import ChatSidebar from './components/ChatSidebar'

const { Header, Content, Footer } = Layout
const { Title, Paragraph } = Typography

function App() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)

  const showSidebar = () => {
    setIsSidebarVisible(true)
  }

  const hideSidebar = () => {
    setIsSidebarVisible(false)
  }

  return (
    <Layout className="app-container">
      <Header className="app-header">
        <Title level={3} style={{ color: 'white', margin: 0 }}>
          ThoughtSpot Agentic Deep Analysis
        </Title>
      </Header>
      <Content className="app-content">
        <div className="content-container">
          <Title level={2}>Welcome to ThoughtSpot Agentic Deep Analysis</Title>
          <Paragraph>
            This application demonstrates the integration of ThoughtSpot with an AI agent
            that can analyze your data and provide insights through a conversational interface.
          </Paragraph>
          
          <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
            <Col xs={24} md={12}>
              <Card title="Data Analysis" bordered={false}>
                <Paragraph>
                  The AI agent can analyze your ThoughtSpot data and provide insights
                  based on your questions. Ask about trends, patterns, or specific metrics
                  in your data.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Interactive Chat" bordered={false}>
                <Paragraph>
                  Use the chat interface to ask questions about your data. The agent will
                  process your request, retrieve relevant data, and provide a response
                  with insights and recommendations.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
      <Footer className="app-footer">
        ThoughtSpot Agentic Deep Analysis ©{new Date().getFullYear()}
      </Footer>
      
      <ChatButton onClick={showSidebar} />
      <ChatSidebar visible={isSidebarVisible} onClose={hideSidebar} />
    </Layout>
  )
}

export default App
