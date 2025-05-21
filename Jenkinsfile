pipeline {
  agent any
  environment {
    // Jenkins credentials: add a "secret text" credential named SONAR_TOKEN
    SONAR_TOKEN = credentials('SONAR_TOKEN')
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build App Docker Image') {
      steps {
        sh 'docker build -t devsecops_lab_app:latest ./app'
      }
    }

    stage('SonarQube Analysis') {
      steps {
        // Requires SonarQube Scanner plugin & SonarQube server defined in Jenkins global config
        withSonarQubeEnv('SonarQube Server') {
          sh 'sonar-scanner -Dsonar.login=$SONAR_TOKEN'
        }
      }
    }

    stage('OWASP ZAP Full Scan') {
      steps {
        // Run ZAP as a Docker container against the running app
        sh '''
          docker run --rm \
            -v $(pwd):/zap/wrk/:rw \
            -t owasp/zap2docker-stable \
            zap-full-scan.py \
              -t http://app:8080 \
              -g gen.conf \
              -r zap_report.html
        '''
        archiveArtifacts artifacts: 'zap_report.html', onlyIfSuccessful: true
      }
    }
  }

  post {
    always {
      // clean up dangling containers/images if necessary
      sh 'docker image prune -f'
    }
  }
}
