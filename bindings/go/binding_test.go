package tree_sitter_liquidsoap_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-liquidsoap"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_liquidsoap.Language())
	if language == nil {
		t.Errorf("Error loading Liquidsoap grammar")
	}
}
