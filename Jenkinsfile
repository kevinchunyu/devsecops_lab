pipeline {
  agent any

  environment {
    // SonarQube token stored as a Secret Text credential named SONAR_TOKEN
    SONAR_TOKEN  = credentials('SONAR_TOKEN')
    // Name must match what you gave in Global Tool Configuration
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
          docker build \
            --pull \
            -t devsecops_lab_app:latest \
            ./app
        '''
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQube Server') {
          // invoke the installed scanner
          sh "${SCANNER_HOME}/bin/sonar-scanner -Dsonar.login=$SONAR_TOKEN"
        }
      }
    }

    stage('Quality Gate') {
      steps {
          waitForQualityGate abortPipeline: true, credentialsId: 'SONAR_TOKEN'
        }
      }
    }

    stage('Run App Container') {
      steps {
        sh '''
          docker run -d \
            --name devsecops_app \
            -p 8080:8080 \
            devsecops_lab_app:latest
        '''
      }
    }

    stage('OWASP ZAP Full Scan') {
      steps {
        sh '''
          docker run --rm \
            --network host \
            -v $(pwd):/zap/wrk/:rw \
            owasp/zap2docker-stable \
            zap-full-scan.py \
              -t http://localhost:8080 \
              -r zap_report.html
        '''
        archiveArtifacts artifacts: 'zap_report.html', fingerprint: true
      }
    }
  }

  post {
    always {
      // Tear down the app and prune images
      sh '''
        docker stop devsecops_app  || true
        docker rm   devsecops_app  || true
        docker image prune -f
      '''
    }
  }
}
