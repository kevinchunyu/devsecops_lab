pipeline {
  agent any

  environment {
    SONAR_TOKEN  = credentials('SONAR_TOKEN')
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
    IMAGE_TAG    = "student001-${BUILD_ID}"
    APP_NAME     = "app_student001_${BUILD_ID}"
    DOCKER_NET   = "zap-net"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Tool Install') {
      steps {
        script {
          tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
        }
      }
    }

    stage('Build App Docker Image') {
      steps {
        sh '''
          docker build -t student_app:${IMAGE_TAG} ./app
        '''
      }
    }

    stage('Run App in Custom Network') {
      steps {
        script {
          sh '''
            docker network inspect zap-net || docker network create zap-net
            docker rm -f app_student001_22 || true
            docker run -d --name app_student001_22 --network zap-net student_app:student001-22

            echo ⏳ Waiting for app to become reachable...
            for i in {1..10}; do
              if curl -s --head http://app_student001_22:3009 | grep "200 OK" > /dev/null; then
                echo ✅ App is reachable!
                break
              fi
              echo "⏳ Attempt $i: App not reachable yet..."
              sleep 3
            done
          '''
        }
      }
    }


    stage('OWASP ZAP Baseline Scan') {
      steps {
        sh '''
          echo "🕷️ Starting OWASP ZAP Baseline Scan..."
          chmod -R 777 $WORKSPACE

          docker run --rm \
            --network ${DOCKER_NET} \
            --user 0:0 \
            -v $WORKSPACE:/zap/wrk/:rw \
            zaproxy/zap-stable \
            zap-baseline.py -t http://${APP_NAME}:3009 -r zap_baseline_report.html -J zap_baseline_report.json
        '''
      }
    }

    stage('SonarQube Analysis') {
      when {
        expression { return params.RUN_SONAR ?: false }
      }
      steps {
        withSonarQubeEnv('SonarQube Server') {
          sh '''
            ${SCANNER_HOME}/bin/sonar-scanner \
              -Dsonar.login=${SONAR_TOKEN} \
              -Dsonar.projectKey=devsecops_lab_student001 \
              -Dsonar.projectName="DevSecOps Lab - student001" \
              -Dsonar.projectVersion=${BUILD_ID} \
              -Dsonar.sources=app \
              -Dsonar.exclusions=**/node_modules/** \
              -Dsonar.javascript.file.suffixes=.js \
              -Dsonar.sourceEncoding=UTF-8 \
              -Dsonar.javascript.node.maxspace=4096
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: '*.html,*.json', allowEmptyArchive: true
      echo "✅ Pipeline completed."
    }
    failure {
      echo "❌ Pipeline failed. Check logs above."
    }
  }
}
