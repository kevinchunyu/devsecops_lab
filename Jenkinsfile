pipeline {
  agent any

  environment {
    // Jenkins credentials: Secret Text credential named SONAR_TOKEN
    SONAR_TOKEN  = credentials('SONAR_TOKEN')
    // The SonarScanner tool you installed globally
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build App Docker Image') {
      steps {
        sh '''
          docker build --pull \
            -t devsecops_lab_app:latest \
            ./app
        '''
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQube Server') {
          sh "${SCANNER_HOME}/bin/sonar-scanner -Dsonar.login=$SONAR_TOKEN"
        }
      }
    }

    stage('Run App Container') {
      steps {
        sh '''
          # tear down any previous instance
          docker rm -f devsecops_app 2>/dev/null || true

          # start the app on host port 9080 mapping to container 8080
          docker run -d \
            --name devsecops_app \
            -p 9080:8080 \
            devsecops_lab_app:latest
          
          # Wait for app to be ready
          sleep 10
        '''
      }
    }

    stage('OWASP ZAP Full Scan') {
      steps {
        sh '''
          docker run --rm \
            --network host \
            -v $(pwd):/zap/wrk/:rw \
            zaproxy/zap-stable \
            zap-full-scan.py \
              -t http://localhost:9080 \
              -r zap_report.html
        '''
        archiveArtifacts artifacts: 'zap_report.html', fingerprint: true
      }
    }
  }

  post {
    always {
      sh '''
        # clean up the app container & dangling images
        docker stop devsecops_app  || true
        docker rm   devsecops_app  || true
        docker image prune -f
      '''
    }
  }
}