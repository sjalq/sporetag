#!/bin/bash

# Pre-commit hook script to detect secrets and credentials
# This script scans staged files for common credential patterns

echo "🔍 Scanning staged files for secrets and credentials..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
    echo "✅ No staged files to check"
    exit 0
fi

# Define patterns to search for
PATTERNS=(
    # Database connection strings
    "postgresql://[^[:space:]\"']+:[^[:space:]\"']+@"
    "mysql://[^[:space:]\"']+:[^[:space:]\"']+@"
    "mongodb://[^[:space:]\"']+:[^[:space:]\"']+@"
    
    # API keys and tokens
    "api[_-]?key[\"']*[:=][\"']*[a-zA-Z0-9+/=]{20,}"
    "access[_-]?token[\"']*[:=][\"']*[a-zA-Z0-9+/=]{20,}"
    "secret[_-]?key[\"']*[:=][\"']*[a-zA-Z0-9+/=]{20,}"
    "private[_-]?key[\"']*[:=][\"']*[a-zA-Z0-9+/=]{20,}"
    
    # AWS credentials
    "AKIA[0-9A-Z]{16}"
    "aws[_-]?access[_-]?key[_-]?id[\"']*[:=][\"']*[A-Z0-9]{20}"
    "aws[_-]?secret[_-]?access[_-]?key[\"']*[:=][\"']*[A-Za-z0-9+/=]{40}"
    
    # Common password patterns
    "password[\"']*[:=][\"']*[^[:space:]\"']{8,}"
    "passwd[\"']*[:=][\"']*[^[:space:]\"']{8,}"
    "pwd[\"']*[:=][\"']*[^[:space:]\"']{8,}"
    
    # Token patterns
    "token[\"']*[:=][\"']*[a-zA-Z0-9+/=_-]{20,}"
)

SECRETS_FOUND=0

for FILE in $STAGED_FILES; do
    if [ -f "$FILE" ]; then
        for PATTERN in "${PATTERNS[@]}"; do
            if grep -qiE "$PATTERN" "$FILE"; then
                echo "❌ Potential secret found in $FILE:"
                grep -niE "$PATTERN" "$FILE" | head -3
                SECRETS_FOUND=1
            fi
        done
    fi
done

if [ $SECRETS_FOUND -eq 1 ]; then
    echo ""
    echo "🚨 COMMIT BLOCKED: Potential secrets detected!"
    echo "Please remove any hardcoded credentials before committing."
    echo "Consider using environment variables instead."
    exit 1
fi

echo "✅ No secrets detected in staged files"
exit 0