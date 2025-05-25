pipeline {
  agent any

  parameters {
    string(name: 'STUDENT_REPO_URL', defaultValue: 'https://github.com/kevinchunyu/devsecops_lab.git', description: 'Student GitHub repository URL')
    string(name: 'BRANCH_NAME', defaultValue: 'main', description: 'Branch to test')
    string(name: 'STUDENT_ID', defaultValue: 'student001', description: 'Student identifier')
  }

  tools {
    nodejs 'Node 18'
  }

  environment {
    SONAR_TOKEN = credentials('SONAR_TOKEN')
    SCANNER_HOME = tool name: 'SonarScanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
    IMAGE_TAG = "student_app:${params.STUDENT_ID}-${BUILD_NUMBER}"
    APP_NAME = "app_${params.STUDENT_ID}_${BUILD_NUMBER}"
    TEST_PORT = "${9100 + (BUILD_NUMBER.toInteger() % 50)}"
    DOCKER_NET = "zap-net"
  }

  stages {
    stage('Checkout') {
      steps {
        git branch: "${params.BRANCH_NAME}", url: "${params.STUDENT_REPO_URL}"
      }
    }

    // stage('SonarQube Analysis') {
    //   steps {
    //     withSonarQubeEnv('SonarQube Server') {
    //       sh '''
    //         ${SCANNER_HOME}/bin/sonar-scanner \
    //           -Dsonar.login=$SONAR_TOKEN \
    //           -Dsonar.projectKey=devsecops_lab_${STUDENT_ID} \
    //           -Dsonar.projectName="DevSecOps Lab - ${STUDENT_ID}" \
    //           -Dsonar.projectVersion=${BUILD_NUMBER} \
    //           -Dsonar.sources=app \
    //           -Dsonar.exclusions="**/node_modules/**" \
    //           -Dsonar.javascript.file.suffixes=.js \
    //           -Dsonar.sourceEncoding=UTF-8 \
    //           -Dsonar.javascript.node.maxspace=4096
    //       '''
    //     }
    //   }
    // }

    stage('Build App') {
      steps {
        sh '''
          docker build -t ${IMAGE_TAG} ./app
        '''
      }
    }

    stage('Run App in Custom Network') {
      steps {
        sh '''
          docker network create zap-net || true

          docker rm -f ${APP_NAME} || true

          docker run -d --name ${APP_NAME} --network zap-net student_app:${BUILD_ID}

          echo "🔄 Waiting for ${APP_NAME} to become reachable..."

          # Try up to 10 times to get a successful response
          for i in {1..10}; do
            if curl -s --fail http://${APP_NAME}:3009 > /dev/null; then
              echo "✅ ${APP_NAME} is up!"
              break
            else
              echo "  ↪ Still waiting... (${i}/10)"
              sleep 3
            fi
          done

          # Final check to ensure it's reachable, else fail
          if ! curl -s --fail http://${APP_NAME}:3009 > /dev/null; then
            echo "❌ ERROR: ${APP_NAME} failed to start."
            exit 1
          fi
        '''
      }
    }



    stage('OWASP ZAP Baseline Scan') {
      steps {
        sh '''
          echo "🕷️ Starting OWASP ZAP Baseline Scan..."

          chmod -R 777 ${WORKSPACE}

          docker run --rm \
            --network zap-net \
            --user 0:0 \
            -v ${WORKSPACE}:/zap/wrk/:rw \
            zaproxy/zap-stable zap-baseline.py \
              -t http://${APP_NAME}:3009 \
              -r zap_baseline_report.html \
              -J zap_baseline_report.json
          EXIT_CODE=$?

          if [ "$EXIT_CODE" -eq 2 ]; then
            echo "⚠️ ZAP completed with warnings (exit 2) – continuing."
          elif [ "$EXIT_CODE" -ne 0 ]; then
            echo "❌ ZAP scan failed (exit code $EXIT_CODE)"
            exit $EXIT_CODE
          fi
        '''
      }
    }



    stage('Cleanup') {
      steps {
        sh '''
          echo "🧹 Cleaning up..."
          docker stop ${APP_NAME} 2>/dev/null || true
          docker rm ${APP_NAME} 2>/dev/null || true
          docker rmi ${IMAGE_TAG} 2>/dev/null || true
        '''
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'zap_baseline_report.*', allowEmptyArchive: true
    }
    success {
      echo '🎉 Pipeline completed successfully!'
    }
    failure {
      echo '❌ Pipeline failed. Check the logs above for details.'
    }
  }
}
