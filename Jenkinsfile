pipeline {
  agent any

  environment {
    VERSION = "student001-24"
    APP_NAME = "app_${VERSION}"
    IMAGE_NAME = "student_app:${VERSION}"
    TARGET_URL = "http://${APP_NAME}:3009"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build App Docker Image') {
      steps {
        sh "docker build -t ${IMAGE_NAME} ./app"
      }
    }

    stage('Run App in Custom Network') {
      steps {
        script {
          sh """
            docker network inspect zap-net >/dev/null 2>&1 || docker network create zap-net
            docker rm -f ${APP_NAME} || true
            docker run -d --name ${APP_NAME} --network zap-net ${IMAGE_NAME}
            echo "⏳ Waiting for ${APP_NAME} to become reachable..."

            for i in {1..10}; do
              if curl -s --head ${TARGET_URL}/health | grep "200 OK" > /dev/null; then
                echo "✅ App is up and reachable at ${TARGET_URL}"
                break
              else
                echo "⏳ Attempt \$i: App not reachable yet..."
                sleep 3
              fi
            done
          """
        }
      }
    }

    stage('OWASP ZAP Baseline Scan') {
      steps {
        sh """
          echo "🕷️ Starting OWASP ZAP Baseline Scan..."
          chmod -R 777 \$WORKSPACE
          docker run --rm --network zap-net --user 0:0 \
            -v \$WORKSPACE:/zap/wrk/:rw \
            zaproxy/zap-stable \
            zap-baseline.py -t ${TARGET_URL} \
            -r zap_baseline_report.html -J zap_baseline_report.json
        """
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'zap_baseline_report.*', allowEmptyArchive: true
      echo '✅ Pipeline completed (success or failure)'
    }
    failure {
      echo '❌ Pipeline failed'
    }
  }
}
