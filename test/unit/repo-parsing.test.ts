/**
 * Tests for repository URL parsing (GitHub, GitLab, Bitbucket)
 */

import { describe, it, expect } from '@jest/globals';
import { parseRepoUrl, parseGitHubUrl } from '../../src/registry/github.js';
import { parseGitLabUrl } from '../../src/registry/gitlab.js';
import { parseBitbucketUrl } from '../../src/registry/bitbucket.js';

describe('parseRepoUrl (unified)', () => {
  describe('GitHub URLs', () => {
    it('should parse standard GitHub HTTPS URL', () => {
      const result = parseRepoUrl('https://github.com/facebook/react');
      expect(result).toEqual({ host: 'github', owner: 'facebook', repo: 'react' });
    });

    it('should parse GitHub URL with .git suffix', () => {
      const result = parseRepoUrl('https://github.com/facebook/react.git');
      expect(result).toEqual({ host: 'github', owner: 'facebook', repo: 'react' });
    });

    it('should parse GitHub SSH URL', () => {
      const result = parseRepoUrl('git@github.com:facebook/react.git');
      expect(result).toEqual({ host: 'github', owner: 'facebook', repo: 'react' });
    });

    it('should handle repo names with hyphens and dots', () => {
      const result = parseRepoUrl('https://github.com/aws/aws-sdk-js-v3');
      expect(result).toEqual({ host: 'github', owner: 'aws', repo: 'aws-sdk-js-v3' });
    });
  });

  describe('GitLab URLs', () => {
    it('should parse standard GitLab HTTPS URL', () => {
      const result = parseRepoUrl('https://gitlab.com/gitlab-org/gitlab');
      expect(result).toEqual({ host: 'gitlab', owner: 'gitlab-org', repo: 'gitlab' });
    });

    it('should parse GitLab URL with .git suffix', () => {
      const result = parseRepoUrl('https://gitlab.com/inkscape/inkscape.git');
      expect(result).toEqual({ host: 'gitlab', owner: 'inkscape', repo: 'inkscape' });
    });

    it('should parse GitLab SSH URL', () => {
      const result = parseRepoUrl('git@gitlab.com:gitlab-org/gitlab-runner.git');
      expect(result).toEqual({ host: 'gitlab', owner: 'gitlab-org', repo: 'gitlab-runner' });
    });

    it('should handle nested groups', () => {
      const result = parseRepoUrl('https://gitlab.com/group/subgroup/project');
      expect(result).toEqual({ host: 'gitlab', owner: 'group/subgroup', repo: 'project' });
    });
  });

  describe('Bitbucket URLs', () => {
    it('should parse standard Bitbucket HTTPS URL', () => {
      const result = parseRepoUrl('https://bitbucket.org/atlassian/python-bitbucket');
      expect(result).toEqual({ host: 'bitbucket', owner: 'atlassian', repo: 'python-bitbucket' });
    });

    it('should parse Bitbucket URL with .git suffix', () => {
      const result = parseRepoUrl('https://bitbucket.org/atlassian/stash-example-plugin.git');
      expect(result).toEqual({ host: 'bitbucket', owner: 'atlassian', repo: 'stash-example-plugin' });
    });

    it('should parse Bitbucket SSH URL', () => {
      const result = parseRepoUrl('git@bitbucket.org:atlassian/python-bitbucket.git');
      expect(result).toEqual({ host: 'bitbucket', owner: 'atlassian', repo: 'python-bitbucket' });
    });
  });

  describe('Unsupported URLs', () => {
    it('should return null for unsupported hosts', () => {
      expect(parseRepoUrl('https://codeberg.org/owner/repo')).toBeNull();
      expect(parseRepoUrl('https://sourceforge.net/projects/foo')).toBeNull();
    });

    it('should return null for malformed URLs', () => {
      expect(parseRepoUrl('not-a-url')).toBeNull();
      expect(parseRepoUrl('')).toBeNull();
    });
  });
});

describe('parseGitHubUrl (legacy)', () => {
  it('should parse standard URL', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('should return null for non-GitHub URLs', () => {
    expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
  });
});

describe('parseGitLabUrl', () => {
  it('should parse standard URL', () => {
    const result = parseGitLabUrl('https://gitlab.com/owner/repo');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('should return null for non-GitLab URLs', () => {
    expect(parseGitLabUrl('https://github.com/owner/repo')).toBeNull();
  });
});

describe('parseBitbucketUrl', () => {
  it('should parse standard URL', () => {
    const result = parseBitbucketUrl('https://bitbucket.org/owner/repo');
    expect(result).toEqual({ owner: 'owner', repo: 'repo' });
  });

  it('should return null for non-Bitbucket URLs', () => {
    expect(parseBitbucketUrl('https://github.com/owner/repo')).toBeNull();
  });
});
