import XCTest
import SwiftTreeSitter
import TreeSitterLiquidsoap

final class TreeSitterLiquidsoapTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_liquidsoap())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Liquidsoap grammar")
    }
}
