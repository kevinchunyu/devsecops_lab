pipeline {
  agent any
  tools {
      nodejs 'Node 18' // Name from your NodeJS installation
  }
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
          # Clean up any previous instance
          docker rm -f devsecops_app 2>/dev/null || true

          # Start the app container
          docker run -d \
            --name devsecops_app \
            -p 9080:3009 \
            devsecops_lab_app:latest
          
          # Wait for app to start
          echo "Waiting for app to start..."
          sleep 10
          
          # Verify app is running and accessible
          for i in 1 2 3 4 5; do
            if curl -f --connect-timeout 5 http://localhost:9080; then
              echo "App is ready!"
              break
            else
              echo "Attempt $i: Waiting for app..."
              sleep 5
            fi
          done
        '''
      }
    }

    stage('OWASP ZAP Targeted Full Scan (SQLi & XSS Only)') {
      steps {
        sh '''
          docker run --rm \
            --network host \
            -v $(pwd):/zap/wrk/:rw \
            zaproxy/zap-stable zap-full-scan.py \
              -t http://localhost:9080 \
              -r zap_report.html \
              -J zap_report.json \
              -z "-config scanner.attackStrength=HIGH \
                  -config scanner.alertThreshold=LOW \
                  -addoninstall ascanrulesBeta \
                  -scannerId 40012,40018"
        '''
        archiveArtifacts artifacts: 'zap_report.*', fingerprint: true
      }
    }
  }

  post {
    always {
      sh '''
        # Clean up
        docker stop devsecops_app  || true
        docker rm   devsecops_app  || true
        docker image prune -f
      '''
    }
  }
}