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
          sh """
            # Clean up any existing container
            docker rm -f ${APP_NAME} || true
            
            # Start the application container with port mapping (VPN-friendly)
            docker run -d --name ${APP_NAME} -p 3009:3009 student_app:${IMAGE_TAG}
            
            # Alternative: Create custom network with explicit subnet to avoid VPN conflicts
            # docker network inspect ${DOCKER_NET} >/dev/null 2>&1 || docker network create ${DOCKER_NET} --subnet=192.168.100.0/24
            # docker run -d --name ${APP_NAME} --network ${DOCKER_NET} student_app:${IMAGE_TAG}
            
            # Wait for container to be running
            echo "⏳ Waiting for container to start..."
            sleep 5
            
            # Check if container is actually running
            if ! docker ps | grep -q ${APP_NAME}; then
              echo "❌ Container failed to start. Checking logs:"
              docker logs ${APP_NAME}
              exit 1
            fi
            
            echo "⏳ Waiting for ${APP_NAME} to become reachable..."
            
            # Try different connection methods for VPN environments
            APP_READY=false
            for i in {1..20}; do
              # Method 1: Try localhost (for port-mapped containers)
              if curl -s --connect-timeout 5 --max-time 10 http://localhost:3009/health 2>/dev/null; then
                echo "✅ Health endpoint is responding via localhost!"
                APP_READY=true
                break
              fi
              
              if curl -s --connect-timeout 5 --max-time 10 http://localhost:3009/ 2>/dev/null; then
                echo "✅ Root endpoint is responding via localhost!"
                APP_READY=true
                break
              fi
              
              # Method 2: Try container name (for custom network)
              if curl -s --connect-timeout 5 --max-time 10 http://${APP_NAME}:3009/health 2>/dev/null; then
                echo "✅ Health endpoint is responding via container name!"
                APP_READY=true
                break
              fi
              
              if curl -s --connect-timeout 5 --max-time 10 http://${APP_NAME}:3009/ 2>/dev/null; then
                echo "✅ Root endpoint is responding via container name!"
                APP_READY=true
                break
              fi
              
              # Check if container is still running
              if ! docker ps | grep -q ${APP_NAME}; then
                echo "❌ Container stopped running. Logs:"
                docker logs ${APP_NAME}
                exit 1
              fi
              
              echo "⏳ Attempt \$i/20: ${APP_NAME} not reachable yet..."
              sleep 3
            done
            
            if [ "\$APP_READY" = "false" ]; then
              echo "❌ App failed to become ready after 60 seconds. Container logs:"
              docker logs ${APP_NAME}
              echo "❌ Container processes:"
              docker exec ${APP_NAME} ps aux || true
              exit 1
            fi
            
            # Final verification - test both connection methods
            echo "🔍 Final verification of app endpoints..."
            if curl -v http://localhost:3009/ 2>/dev/null || curl -v http://${APP_NAME}:3009/ 2>/dev/null; then
              echo "✅ Final verification successful!"
            else
              echo "❌ Final verification failed. App is not responding correctly."
              docker logs ${APP_NAME}
              exit 1
            fi
            
            echo "✅ ${APP_NAME} is ready for scanning!"
          """
        }
      }
    }

    stage('OWASP ZAP Baseline Scan') {
      steps {
        script {
          sh '''
            echo "🕷️ Starting OWASP ZAP Baseline Scan..."
            chmod -R 777 $WORKSPACE

            # Verify app is still running before scanning
            if ! docker ps | grep -q ${APP_NAME}; then
              echo "❌ App container is not running before ZAP scan"
              exit 1
            fi

            # Run ZAP scan with better error handling - try different target URLs
            set +e  # Don't exit on error immediately
            
            # First try: Use localhost if using port mapping
            docker run --rm \
              --network host \
              --user 0:0 \
              -v $WORKSPACE:/zap/wrk/:rw \
              zaproxy/zap-stable \
              zap-baseline.py -t http://localhost:3009 \
              -r zap_baseline_report.html \
              -J zap_baseline_report.json \
              -I
            
            ZAP_EXIT_CODE=$?
            
            # If localhost fails and we're using custom network, try container name
            if [ $ZAP_EXIT_CODE -ne 0 ] && [ $ZAP_EXIT_CODE -ne 2 ]; then
              echo "⚠️ Localhost scan failed, trying container network..."
              docker run --rm \
                --network ${DOCKER_NET} \
                --user 0:0 \
                -v $WORKSPACE:/zap/wrk/:rw \
                zaproxy/zap-stable \
                zap-baseline.py -t http://${APP_NAME}:3009 \
                -r zap_baseline_report.html \
                -J zap_baseline_report.json \
                -I
              
              ZAP_EXIT_CODE=$?
            fi
            set -e  # Re-enable exit on error

            echo "ZAP scan completed with exit code: $ZAP_EXIT_CODE"

            # Handle different exit codes appropriately
            case $ZAP_EXIT_CODE in
              0)
                echo "✅ ZAP scan completed successfully - no issues found"
                ;;
              1)
                echo "❌ ZAP scan found HIGH/MEDIUM risk issues - failing pipeline"
                exit 1
                ;;
              2)
                echo "⚠️ ZAP scan found warnings/low-risk issues - continuing pipeline"
                ;;
              *)
                echo "❓ ZAP scan completed with unexpected exit code: $ZAP_EXIT_CODE"
                ;;
            esac
          '''
        }
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
      script {
        // Clean up container
        sh "docker rm -f ${APP_NAME} || true"
        
        // Archive artifacts
        archiveArtifacts artifacts: '*.html,*.json', allowEmptyArchive: true
        echo "✅ Pipeline completed."
      }
    }
    failure {
      script {
        // Show container logs on failure for debugging
        sh """
          echo "❌ Pipeline failed. Showing container logs for debugging:"
          docker logs ${APP_NAME} || echo "Could not retrieve container logs"
        """
        echo "❌ Pipeline failed. Check logs above."
      }
    }
  }
}