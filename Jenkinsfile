pipeline {
  agent any

  parameters {
    booleanParam(name: 'RUN_SONAR', defaultValue: true, description: 'Run SonarQube Analysis?')
    booleanParam(name: 'RUN_SECURITY_TESTS', defaultValue: true, description: 'Run Security Pattern Tests?')
    string(name: 'STUDENT_ID', defaultValue: 'student001', description: 'Student ID')
  }

  environment {
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
    STUDENT_PROJECT_KEY = "devsecops_lab_${params.STUDENT_ID}"
  }

  stages {
    stage('Environment Info') {
      steps {
        echo "=== DevSecOps Pattern Test Lab - ${params.STUDENT_ID} ==="
        echo "Build ID: ${BUILD_ID}"
      }
    }

    stage('Checkout') {
      steps {
        checkout scm
        echo "✅ Source code checked out"
      }
    }

    stage('Setup') {
      steps {
        script {
          if (!fileExists('backend')) {
            error("❌ 'backend' directory not found")
          }
          if (!fileExists('backend/app.js')) {
            error("❌ 'backend/app.js' not found")
          }
          echo "✅ Backend structure validated"
        }
      }
    }

    stage('Security Pattern Tests') {
      when {
        expression { return params.RUN_SECURITY_TESTS }
      }
      steps {
        dir('backend') {
          sh '''
            # Install Node.js if needed
            if ! command -v node > /dev/null; then
              curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
              apt-get install -y nodejs
            fi
            
            echo "🔍 Running security pattern analysis..."
            npm test
          '''
        }
      }
      post {
        always {
          script {
            if (fileExists('backend/security-test-results.txt')) {
              def results = readFile('backend/security-test-results.txt')
              echo "📊 Test Results: ${results}"
              
              if (results.startsWith('FAILED')) {
                currentBuild.result = 'UNSTABLE'
                echo "⚠️  Security vulnerabilities found"
              }
            }
          }
        }
      }
    }

    stage('SonarQube Analysis') {
      when {
        expression { return params.RUN_SONAR }
      }
      steps {
        dir('backend') {
          withSonarQubeEnv('SonarQube Server') {
            sh '''
              ${SCANNER_HOME}/bin/sonar-scanner \
                -Dsonar.login=${SONAR_TOKEN} \
                -Dsonar.host.url=http://sonarqube:9000 \
                -Dsonar.projectKey=${STUDENT_PROJECT_KEY} \
                -Dsonar.projectName="DevSecOps Lab - ${STUDENT_ID}" \
                -Dsonar.projectVersion=${BUILD_ID} \
                -Dsonar.sources=. \
                -Dsonar.exclusions=**/node_modules/**,**/tests/**
            '''
          }
        }
        echo "✅ SonarQube analysis completed"
      }
    }

    stage('Results Summary') {
      steps {
        echo "=== RESULTS SUMMARY ==="
        echo "Student: ${params.STUDENT_ID}"
        
        script {
          if (params.RUN_SECURITY_TESTS && fileExists('backend/security-test-results.txt')) {
            def results = readFile('backend/security-test-results.txt')
            echo "🔒 Security Tests: ${results.split(':')[0]}"
          }
          
          if (params.RUN_SONAR) {
            echo "📊 SonarQube: http://sonar.internal:9000/dashboard?id=${env.STUDENT_PROJECT_KEY}"
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'backend/security-test-results.txt', allowEmptyArchive: true
      echo "Build completed for ${params.STUDENT_ID}"
    }
    
    success {
      echo "🎉 Pipeline completed successfully"
    }
    
    failure {
      echo "❌ Pipeline failed"
    }
    
    unstable {
      echo "⚠️  Security issues detected - Review findings"
    }
  }
}