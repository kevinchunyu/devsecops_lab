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
          docker network create ${DOCKER_NET} || true

          docker rm -f ${APP_NAME} 2>/dev/null || true

          docker run -d \
            --name ${APP_NAME} \
            --network ${DOCKER_NET} \
            ${IMAGE_TAG}

          echo "Waiting for app to become reachable..."
          for i in {1..10}; do
            curl -s "http://${APP_NAME}:3009" > /dev/null && break
            echo "  ↪ Waiting for ${APP_NAME} (retry $i)..."
            sleep 3
          done
        '''
      }
    }

    
    stage('OWASP ZAP Baseline Scan') {
      steps {
        sh '''
          echo "🕷️ Starting OWASP ZAP Baseline Scan..."

          # Ensure write access
          chmod -R 777 ${WORKSPACE}

          docker run --rm \
            --network ${DOCKER_NET} \
            --user 0:0 \
            -v ${WORKSPACE}:/zap/wrk/:rw \
            zaproxy/zap-stable zap-baseline.py \
              -t http://${APP_NAME}:3009 \
              -r zap_baseline_report.html \
              -J zap_baseline_report.json

          echo "📄 Listing generated ZAP reports:"
          ls -la ${WORKSPACE}/zap_baseline_report.*
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
